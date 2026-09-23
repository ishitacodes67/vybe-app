const express = require("express");
const mongoose = require("mongoose");
const Event = require("../models/Event");
const EventReview = require("../models/EventReview");
const User = require("../models/User");
const Registration = require("../models/Registration");
require("../models/Institution");
const { verifyToken, requireRole } = require("../middleware/auth");
const { createNotification } = require("../utils/notify");

const router = express.Router();

router.use(verifyToken, requireRole("authority"));

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

async function safeNotify(userId, title, message, type, link) {
  try {
    await createNotification(userId, { title, message, type, link });
  } catch (err) {
    console.error("[notify] failed:", err.message);
  }
}

async function loadEventInInstitution(eventId, institutionId) {
  if (!isValidId(eventId)) {
    const e = new Error("Invalid event id");
    e.status = 400;
    throw e;
  }
  const event = await Event.findById(eventId).populate("organizer", "name email");
  if (!event) {
    const e = new Error("Event not found");
    e.status = 404;
    throw e;
  }
  if (String(event.institution) !== String(institutionId)) {
    const e = new Error("This event does not belong to your institution");
    e.status = 403;
    throw e;
  }
  return event;
}

// ---------- GET /api/authority/stats ----------
router.get("/stats", async (req, res) => {
  try {
    const institutionId = req.user.institution;
    if (!institutionId) {
      return res.status(400).json({ message: "Your account is not linked to an institution" });
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalEvents, pendingEvents, approvedEvents, rejectedEvents,
      totalUsers, totalMembers, totalOrganizers, totalAuthorities,
      totalReviews, approvedReviews, rejectedReviews, thisMonthReviews
    ] = await Promise.all([
      Event.countDocuments({ institution: institutionId }),
      Event.countDocuments({ institution: institutionId, status: "pending" }),
      Event.countDocuments({ institution: institutionId, status: "approved" }),
      Event.countDocuments({ institution: institutionId, status: "rejected" }),
      User.countDocuments({ institution: institutionId }),
      User.countDocuments({ institution: institutionId, role: "member" }),
      User.countDocuments({ institution: institutionId, role: "organizer" }),
      User.countDocuments({ institution: institutionId, role: "authority" }),
      EventReview.countDocuments({}),
      EventReview.countDocuments({ decision: "approved" }),
      EventReview.countDocuments({ decision: "rejected" }),
      EventReview.countDocuments({ decidedAt: { $gte: monthStart } })
    ]);

    res.json({
      events: {
        total: totalEvents,
        pending: pendingEvents,
        approved: approvedEvents,
        rejected: rejectedEvents
      },
      users: {
        total: totalUsers,
        members: totalMembers,
        organizers: totalOrganizers,
        authorities: totalAuthorities
      },
      reviews: {
        total: totalReviews,
        approved: approvedReviews,
        rejected: rejectedReviews,
        thisMonth: thisMonthReviews
      }
    });
  } catch (error) {
    console.error("[GET /authority/stats]", error);
    res.status(500).json({ message: "Failed to fetch stats", error: error.message });
  }
});

// ---------- GET /api/authority/pending ----------
router.get("/pending", async (req, res) => {
  try {
    const events = await Event.find({
      institution: req.user.institution,
      status: "pending"
    })
      .populate("organizer", "name email organizerProfile.orgName")
      .sort({ createdAt: 1 });

    res.json({ events, count: events.length });
  } catch (error) {
    console.error("[GET /authority/pending]", error);
    res.status(500).json({ message: "Failed to fetch pending events", error: error.message });
  }
});

// ---------- GET /api/authority/events ----------
router.get("/events", async (req, res) => {
  try {
    const { status, category, when, limit, skip } = req.query;
    const query = { institution: req.user.institution };

    if (status) query.status = status;
    if (category) query.category = category;

    const today = new Date().toISOString().slice(0, 10);
    if (when === "upcoming") query.date = { $gte: today };
    if (when === "past") query.date = { $lt: today };

    const maxLimit = Math.min(Number(limit) || 50, 100);
    const skipCount = Math.max(Number(skip) || 0, 0);

    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .skip(skipCount)
      .limit(maxLimit)
      .populate("organizer", "name email organizerProfile.orgName");

    res.json({ events, count: events.length });
  } catch (error) {
    console.error("[GET /authority/events]", error);
    res.status(500).json({ message: "Failed to fetch events", error: error.message });
  }
});

// ---------- GET /api/authority/events/:id ----------
router.get("/events/:id", async (req, res) => {
  try {
    const event = await loadEventInInstitution(req.params.id, req.user.institution);

    const [review, regSummary] = await Promise.all([
      EventReview.findOne({ event: event._id }).populate("authority", "name email"),
      Registration.aggregate([
        { $match: { event: event._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);

    const summary = { confirmed: 0, pending: 0, cancelled: 0, rejected: 0 };
    for (const row of regSummary) summary[row._id] = row.count;

    res.json({
      event,
      review: review || null,
      registrationSummary: {
        ...summary,
        total: Object.values(summary).reduce((a, b) => a + b, 0),
        seatsLeft: Math.max(0, event.capacity - event.registeredCount)
      }
    });
  } catch (error) {
    console.error("[GET /authority/events/:id]", error);
    res.status(error.status || 500).json({ message: error.message });
  }
});

// ---------- PATCH /api/authority/events/:id/approve ----------
router.patch("/events/:id/approve", async (req, res) => {
  try {
    const event = await loadEventInInstitution(req.params.id, req.user.institution);

    if (event.status === "approved") {
      return res.status(400).json({ message: "Event is already approved" });
    }

    event.status = "approved";
    event.rejectionReason = undefined;
    await event.save();

    const review = await EventReview.findOneAndUpdate(
      { event: event._id },
      {
        event: event._id,
        authority: req.user.id,
        decision: "approved",
        notes: req.body?.notes || "Approved",
        decidedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await safeNotify(
      event.organizer._id,
      "Event approved",
      `"${event.title}" is now live for students to discover.`,
      "success",
      `/events/${event._id}`
    );

    res.json({ event, review });
  } catch (error) {
    console.error("[PATCH /authority/events/:id/approve]", error);
    res.status(error.status || 500).json({ message: error.message });
  }
});

// ---------- PATCH /api/authority/events/:id/reject ----------
router.patch("/events/:id/reject", async (req, res) => {
  try {
    const { reason, notes } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: "A reason is required to reject an event" });
    }

    const event = await loadEventInInstitution(req.params.id, req.user.institution);

    event.status = "rejected";
    event.rejectionReason = reason;
    await event.save();

    const review = await EventReview.findOneAndUpdate(
      { event: event._id },
      {
        event: event._id,
        authority: req.user.id,
        decision: "rejected",
        notes: notes || reason,
        decidedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await safeNotify(
      event.organizer._id,
      "Event needs changes",
      `"${event.title}" was not approved. Reason: ${reason}`,
      "warning",
      `/events/${event._id}`
    );

    res.json({ event, review });
  } catch (error) {
    console.error("[PATCH /authority/events/:id/reject]", error);
    res.status(error.status || 500).json({ message: error.message });
  }
});

// ---------- POST /api/authority/events/:id/review ----------
router.post("/events/:id/review", async (req, res) => {
  try {
    const { checklist, decision, notes } = req.body;

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "decision must be approved or rejected" });
    }
    if (decision === "rejected" && !notes) {
      return res.status(400).json({ message: "notes are required when rejecting" });
    }

    const event = await loadEventInInstitution(req.params.id, req.user.institution);

    event.status = decision;
    event.rejectionReason = decision === "rejected" ? notes : undefined;
    await event.save();

    const existing = await EventReview.findOne({ event: event._id });
    const mergedChecklist = {
      ...(existing?.checklist?.toObject?.() || existing?.checklist || {}),
      ...(checklist || {})
    };

    const review = await EventReview.findOneAndUpdate(
      { event: event._id },
      {
        event: event._id,
        authority: req.user.id,
        checklist: mergedChecklist,
        decision,
        notes,
        decidedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await safeNotify(
      event.organizer._id,
      decision === "approved" ? "Event approved" : "Event needs changes",
      decision === "approved"
        ? `"${event.title}" is now live for students to discover.`
        : `"${event.title}" was not approved. ${notes || ""}`.trim(),
      decision === "approved" ? "success" : "warning",
      `/events/${event._id}`
    );

    res.json({ event, review });
  } catch (error) {
    console.error("[POST /authority/events/:id/review]", error);
    res.status(error.status || 500).json({ message: error.message });
  }
});

// ---------- GET /api/authority/reviews ----------
router.get("/reviews", async (req, res) => {
  try {
    const { decision, limit, skip } = req.query;
    const query = {};

    if (decision) query.decision = decision;

    const maxLimit = Math.min(Number(limit) || 50, 100);
    const skipCount = Math.max(Number(skip) || 0, 0);

    const reviews = await EventReview.find(query)
      .sort({ decidedAt: -1, createdAt: -1 })
      .skip(skipCount)
      .limit(maxLimit)
      .populate("authority", "name email")
      .populate({
        path: "event",
        select: "title category status date organizer institution",
        match: { institution: req.user.institution },
        populate: { path: "organizer", select: "name email" }
      });

    const filtered = reviews.filter((r) => r.event);

    res.json({ reviews: filtered, count: filtered.length });
  } catch (error) {
    console.error("[GET /authority/reviews]", error);
    res.status(500).json({ message: "Failed to fetch reviews", error: error.message });
  }
});

// ---------- GET /api/authority/users ----------
router.get("/users", async (req, res) => {
  try {
    const { role, search, limit, skip } = req.query;
    const query = { institution: req.user.institution };

    if (role) query.role = role;
    if (search) {
      const re = new RegExp(String(search), "i");
      query.$or = [{ name: re }, { email: re }];
    }

    const maxLimit = Math.min(Number(limit) || 50, 100);
    const skipCount = Math.max(Number(skip) || 0, 0);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skipCount)
      .limit(maxLimit)
      .select("-passwordHash");

    res.json({ users, count: users.length });
  } catch (error) {
    console.error("[GET /authority/users]", error);
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
});

// ---------- PATCH /api/authority/users/:id/role ----------
router.patch("/users/:id/role", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const { role } = req.body;
    if (!["member", "organizer", "authority"].includes(role)) {
      return res.status(400).json({ message: "role must be member, organizer, or authority" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (String(user.institution) !== String(req.user.institution)) {
      return res.status(403).json({ message: "User is not in your institution" });
    }

    if (String(user._id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    if (user.role === "authority" && role !== "authority") {
      const authorityCount = await User.countDocuments({
        institution: req.user.institution,
        role: "authority"
      });
      if (authorityCount <= 1) {
        return res.status(400).json({
          message: "Cannot demote the last authority user in this institution"
        });
      }
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await safeNotify(
      user._id,
      "Your role has been updated",
      `Your role was changed from ${previousRole} to ${role}.`,
      "info",
      "/profile"
    );

    res.json({ user: user.toSafeJSON(), previousRole });
  } catch (error) {
    console.error("[PATCH /authority/users/:id/role]", error);
    res.status(500).json({ message: "Failed to update role", error: error.message });
  }
});

module.exports = router;