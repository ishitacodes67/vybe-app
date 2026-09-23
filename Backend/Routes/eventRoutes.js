const express = require("express");
const mongoose = require("mongoose");
const Event = require("../models/Event");
const User = require("../models/User");
const Registration = require("../models/Registration");
require("../models/Institution");
const { verifyToken, requireRole } = require("../middleware/auth");
const { getRecommendations } = require("../utils/aiClient");

const router = express.Router();

// ---------- helpers ----------

const ALLOWED_FIELDS = [
  "title", "category", "tags", "date", "endDate", "time", "venue",
  "mode", "price", "registrationMode", "capacity", "description"
];

function pickAllowed(body) {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

function normalizeTags(tags) {
  if (tags === undefined) return undefined;
  if (!Array.isArray(tags)) {
    return String(tags)
      .split(/[,\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }
  return tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
}

function validateEventInput(body, { isUpdate = false } = {}) {
  const errors = [];
  const required = ["title", "category", "date", "time", "venue", "capacity"];

  if (!isUpdate) {
    for (const field of required) {
      if (!body[field]) errors.push(`${field} is required`);
    }
  }

  if (body.capacity !== undefined) {
    const cap = Number(body.capacity);
    if (!Number.isFinite(cap) || cap < 1) errors.push("capacity must be a number >= 1");
  }
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) errors.push("price must be a number >= 0");
  }
  if (body.mode && !["online", "offline", "hybrid"].includes(body.mode)) {
    errors.push("mode must be online, offline, or hybrid");
  }
  if (body.registrationMode && !["first-come", "approval"].includes(body.registrationMode)) {
    errors.push("registrationMode must be first-come or approval");
  }
  return errors;
}

// ---------- GET /api/events ----------
// Public. Lists approved events with optional filters.
router.get("/", async (req, res) => {
  try {
    const { category, tags, search, when, mode, institution, limit, skip } = req.query;
    const query = { status: "approved" };

    if (category) query.category = category;
    if (mode) query.mode = mode;
    if (institution && mongoose.isValidObjectId(institution)) {
      query.institution = institution;
    }

    if (tags) {
      const tagList = String(tags)
        .split(/[,\s]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (tagList.length) query.tags = { $in: tagList };
    }

    if (search) {
      const re = new RegExp(String(search), "i");
      query.$or = [{ title: re }, { description: re }, { tags: re }];
    }

    const today = new Date().toISOString().slice(0, 10);
    if (when === "upcoming") query.date = { $gte: today };
    if (when === "past") query.date = { $lt: today };

    const maxLimit = Math.min(Number(limit) || 50, 100);
    const skipCount = Math.max(Number(skip) || 0, 0);

    const events = await Event.find(query)
      .sort({ date: 1 })
      .skip(skipCount)
      .limit(maxLimit)
      .populate("institution", "name")
      .populate("organizer", "name organizerProfile.orgName");

    res.json({ events, count: events.length });
  } catch (error) {
    console.error("[GET /events]", error);
    res.status(500).json({ message: "Failed to fetch events", error: error.message });
  }
});

// ---------- GET /api/events/recommended ----------
// Authenticated. Personalized feed via the Python AI service.
// Only upcoming approved events; excludes ones the user already registered for.
router.get("/recommended", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const today = new Date().toISOString().slice(0, 10);

    const query = {
      status: "approved",
      date: { $gte: today }
    };
    if (user.institution) query.institution = user.institution;

    // Exclude events the user already has a confirmed/pending registration for.
    const userRegs = await Registration.find({
      user: user._id,
      status: { $in: ["confirmed", "pending"] }
    }).select("event").lean();
    const registeredEventIds = userRegs.map((r) => String(r.event));

    const events = await Event.find(query)
      .select("+searchText")
      .populate("institution", "name")
      .populate("organizer", "name organizerProfile.orgName")
      .lean();

    const { ranked } = await getRecommendations({
      user: {
        interests: user.interests,
        goals: user.goals,
        registeredEventIds
      },
      events
    });

    res.json({ events: ranked });
  } catch (error) {
    console.error("[GET /events/recommended]", error);
    res.status(500).json({ message: "Recommendation failed", error: error.message });
  }
});

// ---------- GET /api/events/:id ----------
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event id" });
    }
    const event = await Event.findById(req.params.id)
      .populate("institution", "name")
      .populate("organizer", "name organizerProfile.orgName")
      .populate("media.uploadedBy", "name role");

    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ event });
  } catch (error) {
    console.error("[GET /events/:id]", error);
    res.status(500).json({ message: "Failed to fetch event", error: error.message });
  }
});

// ---------- POST /api/events ----------
// Organizer or authority. New events start as "pending" for review.
router.post(
  "/",
  verifyToken,
  requireRole("organizer", "authority"),
  async (req, res) => {
    try {
      const errors = validateEventInput(req.body);
      if (errors.length) {
        return res.status(400).json({ message: "Validation failed", errors });
      }

      const payload = pickAllowed(req.body);
      payload.tags = normalizeTags(req.body.tags) || [];
      payload.organizer = req.user.id;
      payload.institution = req.user.institution;
      payload.status = "pending";

      const event = await Event.create(payload);
      res.status(201).json({ event });
    } catch (error) {
      console.error("[POST /events]", error);
      res.status(500).json({ message: "Failed to create event", error: error.message });
    }
  }
);

// ---------- PATCH /api/events/:id ----------
// Owner organizer or authority. Partial update. Organizer edits reset status to pending.
router.patch("/:id", verifyToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isOwner = String(event.organizer) === req.user.id;
    const isAuthority = req.user.role === "authority";

    if (!isOwner && !isAuthority) {
      return res.status(403).json({ message: "You can only edit your own events" });
    }

    const errors = validateEventInput(req.body, { isUpdate: true });
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const patch = pickAllowed(req.body);
    if (patch.tags !== undefined) patch.tags = normalizeTags(patch.tags);

    Object.assign(event, patch);

    if (isOwner && !isAuthority) {
      event.status = "pending";
      event.rejectionReason = undefined;
    }

    await event.save();
    res.json({ event });
  } catch (error) {
    console.error("[PATCH /events/:id]", error);
    res.status(500).json({ message: "Failed to update event", error: error.message });
  }
});

// ---------- DELETE /api/events/:id ----------
// Owner organizer or authority. Hard delete.
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isOwner = String(event.organizer) === req.user.id;
    const isAuthority = req.user.role === "authority";

    if (!isOwner && !isAuthority) {
      return res.status(403).json({ message: "You can only delete your own events" });
    }

    await event.deleteOne();
    res.json({ message: "Event deleted", id: req.params.id });
  } catch (error) {
    console.error("[DELETE /events/:id]", error);
    res.status(500).json({ message: "Failed to delete event", error: error.message });
  }
});

module.exports = router;