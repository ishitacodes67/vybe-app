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

// ---------- POST /api/chat ----------
// Frontend sends { message, history?, contextEventIds? }
// Backend: looks up user interests + current approved events, calls Python /chat,
// returns { reply, recommendedEvents, recommendedEventIds }
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

    // Events the user is already registered for (to exclude from suggestions)
    const userRegs = await Registration.find({
      user: user._id,
      status: { $in: ["confirmed", "pending"] }
    }).select("event").lean();
    const registeredEventIds = userRegs.map((r) => String(r.event));

    // Candidate events: approved + upcoming + in user's institution
    const today = new Date().toISOString().slice(0, 10);
    const eventQuery = {
      status: "approved",
      date: { $gte: today }
    };
    if (user.institution) eventQuery.institution = user.institution;

    // If frontend passed specific event IDs (e.g. current screen), use those as candidates
    let candidates;
    if (Array.isArray(contextEventIds) && contextEventIds.length > 0) {
      const validIds = contextEventIds.filter((id) => mongoose.isValidObjectId(id));
      candidates = await Event.find({
        _id: { $in: validIds },
        status: "approved"
      }).lean();
    } else {
      candidates = await Event.find(eventQuery)
        .sort({ date: 1 })
        .limit(50)
        .lean();
    }

    // Call Python /chat
    const { reply, recommendedEventIds } = await getChatReply({
      message: message.trim(),
      user: {
        interests: user.interests || [],
        goals: user.goals || [],
        registeredEventIds
      },
      currentEvents: candidates,
      history: Array.isArray(history) ? history.slice(-6) : []
    });

    // Fetch full details for the recommended IDs (in the same order)
    const recIds = (recommendedEventIds || []).filter((id) => mongoose.isValidObjectId(id));
    const events = await Event.find({ _id: { $in: recIds } })
      .populate("institution", "name")
      .populate("organizer", "name organizerProfile.orgName")
      .lean();

    // Preserve Python's ranking order
    const orderMap = new Map(recIds.map((id, idx) => [String(id), idx]));
    events.sort((a, b) => (orderMap.get(String(a._id)) ?? 999) - (orderMap.get(String(b._id)) ?? 999));

    res.json({
      reply,
      recommendedEventIds: recIds,
      recommendedEvents: events
    });
  } catch (error) {
    console.error("[POST /api/chat]", error);
    res.status(500).json({
      message: "Chat failed",
      error: error.message,
      // Graceful degradation: give the frontend something usable
      reply: "I'm having trouble thinking right now. Try browsing events directly.",
      recommendedEventIds: [],
      recommendedEvents: []
    });
  }
});

module.exports = router;