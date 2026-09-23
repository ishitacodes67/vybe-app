const express = require("express");
const mongoose = require("mongoose");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
require("../models/User");        // register for populate
require("../models/Institution"); // register for nested populate
const { verifyToken, requireRole } = require("../middleware/auth");
const { createNotification } = require("../utils/notify");

const router = express.Router();

// ---------- helpers ----------

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// Wrap notifications so a notify failure never breaks the main action.
async function safeNotify(userId, title, message, type, link) {
  try {
    await createNotification(userId, { title, message, type, link });
  } catch (err) {
    console.error("[notify] failed:", err.message);
  }
}

// ---------- POST /api/registrations/:eventId ----------
router.post("/:eventId", verifyToken, async (req, res) => {
  try {
    if (!isValidId(req.params.eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.status !== "approved") {
      return res.status(400).json({ message: "This event is not open for registration" });
    }

    // Block registering for past events
    const today = new Date().toISOString().slice(0, 10);
    if (event.date < today) {
      return res.status(400).json({ message: "This event has already happened" });
    }

    const wantsApproval = event.registrationMode === "approval";

    // Atomic capacity reservation for first-come events.
    // The filter only matches if registeredCount < capacity, so two
    // simultaneous requests can't both increment past capacity.
    if (!wantsApproval) {
      const reserved = await Event.findOneAndUpdate(
        {
          _id: event._id,
          status: "approved",
          $expr: { $lt: ["$registeredCount", "$capacity"] }
        },
        { $inc: { registeredCount: 1 } },
        { new: true }
      );

      if (!reserved) {
        return res.status(400).json({ message: "This event is full" });
      }
    }

    let registration;
    try {
      registration = await Registration.create({
        user: req.user.id,
        event: event._id,
        status: wantsApproval ? "pending" : "confirmed",
        note: req.body?.note
      });
    } catch (err) {
      // Duplicate → roll back the reserved seat
      if (err.code === 11000) {
        if (!wantsApproval) {
          await Event.findByIdAndUpdate(event._id, { $inc: { registeredCount: -1 } });
        }
        return res.status(409).json({ message: "You're already registered for this event" });
      }
      throw err;
    }

    // Notify the member
    await safeNotify(
      req.user.id,
      wantsApproval ? "Registration submitted" : "Registration confirmed",
      wantsApproval
        ? `Your request to join "${event.title}" is pending approval.`
        : `You're registered for "${event.title}".`,
      wantsApproval ? "info" : "success",
      `/events/${event._id}`
    );

    // If approval mode, also notify the organizer
    if (wantsApproval) {
      await safeNotify(
        event.organizer,
        "New registration request",
        `Someone requested to join "${event.title}".`,
        "info",
        `/organizer/events/${event._id}`
      );
    }

    res.status(201).json({ registration });
  } catch (error) {
    console.error("[POST /registrations/:eventId]", error);
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

// ---------- DELETE /api/registrations/:eventId ----------
// Soft cancel. Confirmed registrations free up a seat.
router.delete("/:eventId", verifyToken, async (req, res) => {
  try {
    if (!isValidId(req.params.eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const registration = await Registration.findOne({
      user: req.user.id,
      event: req.params.eventId
    });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }
    if (registration.status === "cancelled") {
      return res.status(400).json({ message: "This registration is already cancelled" });
    }

    const wasConfirmed = registration.status === "confirmed";
    registration.status = "cancelled";
    registration.cancelledAt = new Date();
    await registration.save();

    if (wasConfirmed) {
      await Event.findByIdAndUpdate(req.params.eventId, {
        $inc: { registeredCount: -1 }
      });
    }

    res.json({ message: "Registration cancelled", registration });
  } catch (error) {
    console.error("[DELETE /registrations/:eventId]", error);
    res.status(500).json({ message: "Cancellation failed", error: error.message });
  }
});

// ---------- GET /api/registrations/me ----------
router.get("/me", verifyToken, async (req, res) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.status) filter.status = req.query.status;

    const registrations = await Registration.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: "event",
        populate: [
          { path: "institution", select: "name" },
          { path: "organizer", select: "name organizerProfile.orgName" }
        ]
      });

    res.json({ registrations, count: registrations.length });
  } catch (error) {
    console.error("[GET /registrations/me]", error);
    res.status(500).json({ message: "Failed to fetch registrations", error: error.message });
  }
});

// ---------- GET /api/registrations/me/:eventId ----------
// Used by the frontend to check "am I registered for this event?"
router.get("/me/:eventId", verifyToken, async (req, res) => {
  try {
    if (!isValidId(req.params.eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }
    const registration = await Registration.findOne({
      user: req.user.id,
      event: req.params.eventId
    });
    res.json({ registration: registration || null });
  } catch (error) {
    console.error("[GET /registrations/me/:eventId]", error);
    res.status(500).json({ message: "Failed to fetch registration", error: error.message });
  }
});

// ---------- GET /api/registrations/event/:eventId ----------
// Organizer (owner) or authority: list every registration for one event.
router.get(
  "/event/:eventId",
  verifyToken,
  requireRole("organizer", "authority"),
  async (req, res) => {
    try {
      if (!isValidId(req.params.eventId)) {
        return res.status(400).json({ message: "Invalid event id" });
      }

      const event = await Event.findById(req.params.eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });

      const isOwner = String(event.organizer) === req.user.id;
      const isAuthority = req.user.role === "authority";
      if (!isOwner && !isAuthority) {
        return res
          .status(403)
          .json({ message: "You can only view registrations for your own events" });
      }

      const filter = { event: event._id };
      if (req.query.status) filter.status = req.query.status;

      const registrations = await Registration.find(filter)
        .sort({ createdAt: -1 })
        .populate("user", "name email course year role");

      res.json({ registrations, count: registrations.length });
    } catch (error) {
      console.error("[GET /registrations/event/:eventId]", error);
      res.status(500).json({ message: "Failed to fetch registrations", error: error.message });
    }
  }
);

// ---------- PATCH /api/registrations/:id/status ----------
// Organizer (owner) or authority: approve or reject a pending registration.
router.patch(
  "/:id/status",
  verifyToken,
  requireRole("organizer", "authority"),
  async (req, res) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({ message: "Invalid registration id" });
      }

      const { status } = req.body;
      if (!["confirmed", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be confirmed or rejected" });
      }

      const registration = await Registration.findById(req.params.id).populate("event");
      if (!registration) return res.status(404).json({ message: "Registration not found" });

      const event = registration.event;
      const isOwner = String(event.organizer) === req.user.id;
      const isAuthority = req.user.role === "authority";
      if (!isOwner && !isAuthority) {
        return res.status(403).json({ message: "You can only decide on your own events" });
      }

      if (registration.status !== "pending") {
        return res.status(400).json({
          message: `Cannot change a registration that is already ${registration.status}`
        });
      }

      // If approving, reserve a seat atomically
      if (status === "confirmed") {
        const reserved = await Event.findOneAndUpdate(
          {
            _id: event._id,
            $expr: { $lt: ["$registeredCount", "$capacity"] }
          },
          { $inc: { registeredCount: 1 } },
          { new: true }
        );

        if (!reserved) {
          return res.status(400).json({ message: "Event is already full" });
        }
      }

      registration.status = status;
      registration.decidedAt = new Date();
      registration.decidedBy = req.user.id;
      await registration.save();

      await safeNotify(
        registration.user,
        status === "confirmed" ? "Registration approved" : "Registration rejected",
        `Your registration for "${event.title}" was ${status}.`,
        status === "confirmed" ? "success" : "warning",
        `/events/${event._id}`
      );

      res.json({ registration });
    } catch (error) {
      console.error("[PATCH /registrations/:id/status]", error);
      res.status(500).json({ message: "Failed to update registration", error: error.message });
    }
  }
);

module.exports = router;