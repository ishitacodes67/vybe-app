const express = require("express");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// Every route in this file requires an authenticated user.
router.use(verifyToken);

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// ---------- GET /api/notifications ----------
// List my notifications with optional filters and pagination.
router.get("/", async (req, res) => {
  try {
    const { read, type, limit, skip } = req.query;
    const query = { user: req.user.id };

    if (read === "true") query.read = true;
    if (read === "false") query.read = false;
    if (type) query.type = type;

    const maxLimit = Math.min(Number(limit) || 20, 100);
    const skipCount = Math.max(Number(skip) || 0, 0);

    const [notifications, total, unread] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skipCount)
        .limit(maxLimit),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: req.user.id, read: false })
    ]);

    res.json({
      notifications,
      count: notifications.length,
      total,
      unread
    });
  } catch (error) {
    console.error("[GET /notifications]", error);
    res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
  }
});

// ---------- GET /api/notifications/unread-count ----------
// Lightweight endpoint for the bell badge.
router.get("/unread-count", async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.id,
      read: false
    });
    res.json({ count });
  } catch (error) {
    console.error("[GET /notifications/unread-count]", error);
    res.status(500).json({ message: "Failed to fetch unread count", error: error.message });
  }
});

// ---------- PATCH /api/notifications/read-all ----------
// Mark all of my unread notifications as read.
router.patch("/read-all", async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("[PATCH /notifications/read-all]", error);
    res.status(500).json({ message: "Failed to mark all as read", error: error.message });
  }
});

// ---------- DELETE /api/notifications/read ----------
// Clear all of my read notifications.
router.delete("/read", async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user.id,
      read: true
    });
    res.json({
      message: "Read notifications cleared",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("[DELETE /notifications/read]", error);
    res.status(500).json({ message: "Failed to clear read notifications", error: error.message });
  }
});

// ---------- GET /api/notifications/:id ----------
router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (String(notification.user) !== req.user.id) {
      return res.status(403).json({ message: "Not your notification" });
    }

    res.json({ notification });
  } catch (error) {
    console.error("[GET /notifications/:id]", error);
    res.status(500).json({ message: "Failed to fetch notification", error: error.message });
  }
});

// ---------- PATCH /api/notifications/:id/read ----------
router.patch("/:id/read", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (String(notification.user) !== req.user.id) {
      return res.status(403).json({ message: "Not your notification" });
    }

    if (!notification.read) {
      notification.read = true;
      await notification.save();
    }

    res.json({ notification });
  } catch (error) {
    console.error("[PATCH /notifications/:id/read]", error);
    res.status(500).json({ message: "Failed to mark as read", error: error.message });
  }
});

// ---------- DELETE /api/notifications/:id ----------
router.delete("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (String(notification.user) !== req.user.id) {
      return res.status(403).json({ message: "Not your notification" });
    }

    await notification.deleteOne();
    res.json({ message: "Notification deleted", id: req.params.id });
  } catch (error) {
    console.error("[DELETE /notifications/:id]", error);
    res.status(500).json({ message: "Failed to delete notification", error: error.message });
  }
});

module.exports = router;