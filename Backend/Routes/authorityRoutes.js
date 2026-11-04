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

// ---------- GET /api/authority/analytics ----------
router.get("/analytics", async (req, res) => {
  try {
    const institutionId = req.user.institution;
    if (!institutionId) return res.status(400).json({ message: "No institution linked" });

    // 1. Events by category
    const categoryStats = await Event.aggregate([
      { $match: { institution: new mongoose.Types.ObjectId(institutionId) } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 2. Registrations over the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Get all event IDs for this institution first (safer than $lookup)
    const events = await Event.find({ institution: institutionId }).select("_id").lean();
    const eventIds = events.map(e => e._id);

    const regStats = await Registration.aggregate([
      {
        $match: {
          event: { $in: eventIds },
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ categories: categoryStats, registrations: regStats });
  } catch (error) {
    console.error("[GET /authority/analytics]", error);
    res.status(500).json({ message: "Failed to fetch analytics", error: error.message });
  }
});

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
      events: { total: totalEvents, pending: pendingEvents, approved: approvedEvents, rejected: rejectedEvents },
      users: { total: totalUsers, members: totalMembers, organizers: totalOrganizers, authorities: totalAuthorities },
      reviews: { total: totalReviews, approved: approvedReviews, rejected: rejectedReviews, thisMonth: thisMonthReviews }
    });
  } catch (error) {
    console.error("[GET /authority/stats]", error);
    res.status(500).json({ message: "Failed to fetch stats", error: error.message });
  }
});

// (Keep all your other existing routes here: /pending, /events, /events/:id, /events/:id/approve, /events/:id/reject, /events/:id/review, /reviews, /users, /users/:id/role)
// PASTE THEM BACK IN FROM YOUR ORIGINAL FILE. 
// I am intentionally leaving them out of this block to save space, but make sure they are in your file below the /stats route.

// ---------- GET /api/authority/pending ----------
router.get("/pending", async (req, res) => {
  try {
    const events = await Event.find({ institution: req.user.institution, status: "pending" })
      .populate("organizer", "name email organizerProfile.orgName")
      .sort({ createdAt: 1 });
    res.json({ events, count: events.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending events", error: error.message });
  }
});

// ... [PASTE THE REST OF YOUR ROUTES HERE] ...

module.exports = router;