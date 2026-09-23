const express = require("express");
const mongoose = require("mongoose");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
require("../models/User");
require("../models/Institution");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// Every route in this file requires an authenticated organizer.
router.use(verifyToken, requireRole("organizer"));

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// ---------- GET /api/organizer/stats ----------
// Dashboard summary cards at the top of the organizer's home.
router.get("/stats", async (req, res) => {
  try {
    const organizerId = new mongoose.Types.ObjectId(req.user.id);

    const [
      totalEvents,
      approvedEvents,
      pendingEvents,
      rejectedEvents,
      upcomingEvents,
      regAgg
    ] = await Promise.all([
      Event.countDocuments({ organizer: organizerId }),
      Event.countDocuments({ organizer: organizerId, status: "approved" }),
      Event.countDocuments({ organizer: organizerId, status: "pending" }),
      Event.countDocuments({ organizer: organizerId, status: "rejected" }),
      Event.countDocuments({
        organizer: organizerId,
        status: "approved",
        date: { $gte: new Date().toISOString().slice(0, 10) }
      }),
      Registration.aggregate([
        {
          $lookup: {
            from: "events",
            localField: "event",
            foreignField: "_id",
            as: "eventDoc"
          }
        },
        { $unwind: "$eventDoc" },
        { $match: { "eventDoc.organizer": organizerId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            confirmed: {
              $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] }
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const r = regAgg[0] || { total: 0, confirmed: 0, pending: 0, cancelled: 0 };

    res.json({
      events: {
        total: totalEvents,
        approved: approvedEvents,
        pending: pendingEvents,
        rejected: rejectedEvents,
        upcoming: upcomingEvents
      },
      registrations: {
        total: r.total,
        confirmed: r.confirmed,
        pending: r.pending,
        cancelled: r.cancelled
      }
    });
  } catch (error) {
    console.error("[GET /organizer/stats]", error);
    res.status(500).json({ message: "Failed to fetch stats", error: error.message });
  }
});

// ---------- GET /api/organizer/events ----------
// All events this organizer has submitted, any status, with filters.
router.get("/events", async (req, res) => {
  try {
    const { status, when, category, limit, skip } = req.query;
    const query = { organizer: req.user.id };

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
      .populate("institution", "name");

    res.json({ events, count: events.length });
  } catch (error) {
    console.error("[GET /organizer/events]", error);
    res.status(500).json({ message: "Failed to fetch events", error: error.message });
  }
});

// ---------- GET /api/organizer/upcoming ----------
// The next N upcoming approved events, for the organizer's home card.
router.get("/upcoming", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    const today = new Date().toISOString().slice(0, 10);

    const events = await Event.find({
      organizer: req.user.id,
      status: "approved",
      date: { $gte: today }
    })
      .sort({ date: 1 })
      .limit(limit)
      .populate("institution", "name");

    res.json({ events, count: events.length });
  } catch (error) {
    console.error("[GET /organizer/upcoming]", error);
    res.status(500).json({ message: "Failed to fetch upcoming events", error: error.message });
  }
});

// ---------- GET /api/organizer/events/:id ----------
// Single event with a small registration summary, if it's yours.
router.get("/events/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await Event.findById(req.params.id)
      .populate("institution", "name")
      .populate("media.uploadedBy", "name role");

    if (!event) return res.status(404).json({ message: "Event not found" });
    if (String(event.organizer) !== req.user.id) {
      return res.status(403).json({ message: "Not your event" });
    }

    const [confirmed, pending, cancelled] = await Promise.all([
      Registration.countDocuments({ event: event._id, status: "confirmed" }),
      Registration.countDocuments({ event: event._id, status: "pending" }),
      Registration.countDocuments({ event: event._id, status: "cancelled" })
    ]);

    res.json({
      event,
      registrationSummary: {
        confirmed,
        pending,
        cancelled,
        total: confirmed + pending + cancelled,
        seatsLeft: Math.max(0, event.capacity - event.registeredCount)
      }
    });
  } catch (error) {
    console.error("[GET /organizer/events/:id]", error);
    res.status(500).json({ message: "Failed to fetch event", error: error.message });
  }
});

// ---------- GET /api/organizer/events/:id/registrations ----------
// Kept from the original, now with filters and better checks.
router.get("/events/:id/registrations", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (String(event.organizer) !== req.user.id) {
      return res.status(403).json({ message: "Not your event" });
    }

    const filter = { event: event._id };
    if (req.query.status) filter.status = req.query.status;

    const registrations = await Registration.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email phone course year role");

    res.json({ registrations, count: registrations.length });
  } catch (error) {
    console.error("[GET /organizer/events/:id/registrations]", error);
    res.status(500).json({ message: "Failed to fetch registrations", error: error.message });
  }
});

// ---------- PATCH /api/organizer/events/:id/cancel ----------
// Soft cancel: sets status to "rejected" with a reason. Nothing is deleted.
router.patch("/events/:id/cancel", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (String(event.organizer) !== req.user.id) {
      return res.status(403).json({ message: "Not your event" });
    }

    if (event.status === "rejected") {
      return res.status(400).json({ message: "This event is already cancelled" });
    }

    event.status = "rejected";
    event.rejectionReason = req.body?.reason || "Cancelled by organizer";
    await event.save();

    res.json({ event });
  } catch (error) {
    console.error("[PATCH /organizer/events/:id/cancel]", error);
    res.status(500).json({ message: "Failed to cancel event", error: error.message });
  }
});

module.exports = router;