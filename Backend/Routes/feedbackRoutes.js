const express = require("express");
const mongoose = require("mongoose");
const Feedback = require("../models/Feedback");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
require("../models/User");
require("../models/Institution");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// ---------- POST /api/feedback/:eventId ----------
router.post("/:eventId", verifyToken, async (req, res) => {
  try {
    if (!isValidId(req.params.eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const { rating, comment } = req.body;
    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be a number between 1 and 5" });
    }

    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const today = new Date().toISOString().slice(0, 10);
    if (event.date >= today) {
      return res.status(400).json({ message: "You can only leave feedback after the event has happened" });
    }

    const registration = await Registration.findOne({
      user: req.user.id,
      event: event._id
    });
    if (!registration) {
      return res.status(403).json({ message: "You did not attend this event" });
    }
    if (!["confirmed", "attended"].includes(registration.status)) {
      return res.status(403).json({
        message: `Cannot leave feedback with registration status "${registration.status}"`
      });
    }

    let feedback;
    try {
      feedback = await Feedback.create({
        user: req.user.id,
        event: event._id,
        rating: numericRating,
        comment
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          message: "You have already left feedback for this event"
        });
      }
      throw err;
    }

    res.status(201).json({ feedback });
  } catch (error) {
    console.error("[POST /feedback/:eventId]", error);
    res.status(500).json({ message: "Failed to submit feedback", error: error.message });
  }
});

// ---------- GET /api/feedback/event/:eventId ----------
router.get("/event/:eventId", async (req, res) => {
  try {
    if (!isValidId(req.params.eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const { limit, skip } = req.query;
    const maxLimit = Math.min(Number(limit) || 20, 100);
    const skipCount = Math.max(Number(skip) || 0, 0);

    const [feedback, agg] = await Promise.all([
      Feedback.find({ event: req.params.eventId })
        .sort({ createdAt: -1 })
        .skip(skipCount)
        .limit(maxLimit)
        .populate("user", "name course year"),
      Feedback.aggregate([
        { $match: { event: new mongoose.Types.ObjectId(req.params.eventId) } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            average: { $avg: "$rating" },
            five: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
            four: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            three: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            two: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            one: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } }
          }
        }
      ])
    ]);

    const summary = agg[0]
      ? {
          count: agg[0].count,
          average: Math.round(agg[0].average * 10) / 10,
          distribution: {
            5: agg[0].five,
            4: agg[0].four,
            3: agg[0].three,
            2: agg[0].two,
            1: agg[0].one
          }
        }
      : { count: 0, average: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

    res.json({ feedback, summary });
  } catch (error) {
    console.error("[GET /feedback/event/:eventId]", error);
    res.status(500).json({ message: "Failed to fetch feedback", error: error.message });
  }
});

// ---------- GET /api/feedback/me ----------
router.get("/me", verifyToken, async (req, res) => {
  try {
    const feedback = await Feedback.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: "event",
        select: "title category date venue posterUrl"
      });

    res.json({ feedback, count: feedback.length });
  } catch (error) {
    console.error("[GET /feedback/me]", error);
    res.status(500).json({ message: "Failed to fetch your feedback", error: error.message });
  }
});

// ---------- GET /api/feedback/me/:eventId ----------
router.get("/me/:eventId", verifyToken, async (req, res) => {
  try {
    if (!isValidId(req.params.eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }
    const feedback = await Feedback.findOne({
      user: req.user.id,
      event: req.params.eventId
    });
    res.json({ feedback: feedback || null });
  } catch (error) {
    console.error("[GET /feedback/me/:eventId]", error);
    res.status(500).json({ message: "Failed to fetch feedback", error: error.message });
  }
});

// ---------- GET /api/feedback/organizer/summary ----------
router.get("/organizer/summary", verifyToken, requireRole("organizer"), async (req, res) => {
  try {
    const organizerId = new mongoose.Types.ObjectId(req.user.id);

    const [overall, perEvent] = await Promise.all([
      Feedback.aggregate([
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
            count: { $sum: 1 },
            average: { $avg: "$rating" }
          }
        }
      ]),
      Feedback.aggregate([
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
            _id: "$eventDoc._id",
            title: { $first: "$eventDoc.title" },
            count: { $sum: 1 },
            average: { $avg: "$rating" }
          }
        },
        { $sort: { average: -1 } }
      ])
    ]);

    res.json({
      overall: overall[0]
        ? { count: overall[0].count, average: Math.round(overall[0].average * 10) / 10 }
        : { count: 0, average: 0 },
      perEvent: perEvent.map((e) => ({
        eventId: e._id,
        title: e.title,
        count: e.count,
        average: Math.round(e.average * 10) / 10
      }))
    });
  } catch (error) {
    console.error("[GET /feedback/organizer/summary]", error);
    res.status(500).json({ message: "Failed to fetch summary", error: error.message });
  }
});

// ---------- DELETE /api/feedback/:id ----------
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid feedback id" });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });

    const isOwner = String(feedback.user) === req.user.id;
    const isAuthority = req.user.role === "authority";

    if (!isOwner && !isAuthority) {
      return res.status(403).json({ message: "You can only delete your own feedback" });
    }

    if (isAuthority && !isOwner) {
      const event = await Event.findById(feedback.event);
      if (!event || String(event.institution) !== String(req.user.institution)) {
        return res.status(403).json({ message: "Feedback is not in your institution" });
      }
    }

    await feedback.deleteOne();
    res.json({ message: "Feedback deleted", id: req.params.id });
  } catch (error) {
    console.error("[DELETE /feedback/:id]", error);
    res.status(500).json({ message: "Failed to delete feedback", error: error.message });
  }
});

module.exports = router;