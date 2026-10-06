const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
require("../models/Institution");
const { verifyToken } = require("../middleware/auth");
const { getChatReply } = require("../utils/aiClient");
const { chatLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

// ---------- In-memory response cache ----------
// Keyed by user + message + context. 5-min TTL. Skips repeated AI calls.
const RESPONSE_CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

function cacheGet(key) {
  const entry = RESPONSE_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    RESPONSE_CACHE.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value) {
  RESPONSE_CACHE.set(key, { ts: Date.now(), value });
  if (RESPONSE_CACHE.size > CACHE_MAX_ENTRIES) {
    const oldest = [...RESPONSE_CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) RESPONSE_CACHE.delete(oldest[0]);
  }
}

// ---------- Friendly fallback ----------
function buildFallbackReply(candidates) {
  if (!candidates || candidates.length === 0) {
    return {
      reply: "I couldn't reach my brain just now, and there aren't any upcoming events to suggest yet. Check back soon!",
      events: []
    };
  }
  const top = [...candidates]
    .sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0))
    .slice(0, 3);
  const titles = top.map((e) => e.title).join(" · ");
  return {
    reply: `I'm running a little slow right now, but here's what's popular on campus: ${titles}. Try one of these!`,
    events: top
  };
}

// ---------- POST /api/chat ----------
router.post("/", chatLimiter, verifyToken, async (req, res) => {
  try {
    const { message, history, contextEventIds } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ message: "message is required" });
    }
    if (message.length > 500) {
      return res.status(400).json({ message: "message is too long (max 500 chars)" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Cache lookup — skip everything else if we've answered this exact question recently
    const cacheKey = `${user._id}:${message.trim().toLowerCase()}:${(contextEventIds || []).join(",")}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Events the user is already registered for
    const userRegs = await Registration.find({
      user: user._id,
      status: { $in: ["confirmed", "pending"] }
    }).select("event").lean();
    const registeredEventIds = userRegs.map((r) => String(r.event));

    // Candidate events
    const today = new Date().toISOString().slice(0, 10);
    const eventQuery = { status: "approved", date: { $gte: today } };
    if (user.institution) eventQuery.institution = user.institution;

    let candidates;
    if (Array.isArray(contextEventIds) && contextEventIds.length > 0) {
      const validIds = contextEventIds.filter((id) => mongoose.isValidObjectId(id));
      candidates = await Event.find({ _id: { $in: validIds }, status: "approved" }).lean();
    } else {
      candidates = await Event.find(eventQuery).sort({ date: 1 }).limit(50).lean();
    }

    // AI with one retry
    let aiResult = null;
    let aiError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        aiResult = await getChatReply({
          message: message.trim(),
          user: {
            interests: user.interests || [],
            goals: user.goals || [],
            registeredEventIds
          },
          currentEvents: candidates,
          history: Array.isArray(history) ? history.slice(-6) : []
        });
        aiError = null;
        break;
      } catch (err) {
        aiError = err;
        console.warn(`[POST /api/chat] AI attempt ${attempt + 1} failed: ${err.message}`);
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }

    // Fallback — NOT cached (transient)
    if (!aiResult) {
      console.error("[POST /api/chat] AI unavailable, using fallback:", aiError?.message);
      const fallback = buildFallbackReply(candidates);
      return res.json({
        reply: fallback.reply,
        recommendedEventIds: fallback.events.map((e) => String(e._id)),
        recommendedEvents: fallback.events,
        fallback: true
      });
    }

    // Success — fetch full event details in ranked order
    const { reply, recommendedEventIds } = aiResult;
    const recIds = (recommendedEventIds || []).filter((id) => mongoose.isValidObjectId(id));

    const events = await Event.find({ _id: { $in: recIds } })
      .populate("institution", "name")
      .populate("organizer", "name organizerProfile.orgName")
      .lean();

    const orderMap = new Map(recIds.map((id, idx) => [String(id), idx]));
    events.sort(
      (a, b) =>
        (orderMap.get(String(a._id)) ?? 999) - (orderMap.get(String(b._id)) ?? 999)
    );

    const payload = {
      reply,
      recommendedEventIds: recIds,
      recommendedEvents: events,
      fallback: false
    };

    // Cache the successful result
    cacheSet(cacheKey, payload);

    return res.json({ ...payload, cached: false });
  } catch (error) {
    console.error("[POST /api/chat]", error);
    return res.json({
      reply: "Something went wrong on my side. Try Discover while I recover.",
      recommendedEventIds: [],
      recommendedEvents: [],
      fallback: true
    });
  }
});

module.exports = router;