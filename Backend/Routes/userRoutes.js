const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Registration = require("../models/Registration");
const Event = require("../models/Event");
require("../models/Institution");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function normalizeStringArray(input) {
  if (!Array.isArray(input)) {
    if (typeof input === "string") {
      return input
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    }
    return undefined;
  }
  return input.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
}

// ---------- GET /api/users/me ----------
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("institution", "name domain");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: user.toSafeJSON() });
  } catch (error) {
    console.error("[GET /users/me]", error);
    res.status(500).json({ message: "Failed to fetch profile", error: error.message });
  }
});

// ---------- PATCH /api/users/me ----------
// Update basic profile fields. Email and role cannot be changed here.
router.patch("/me", verifyToken, async (req, res) => {
  try {
    const allowedFields = ["name", "phone", "course", "year"];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = typeof req.body[field] === "string"
          ? req.body[field].trim()
          : req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    if (updates.name !== undefined && updates.name.length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters" });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true
    }).populate("institution", "name domain");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user: user.toSafeJSON() });
  } catch (error) {
    console.error("[PATCH /users/me]", error);
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
});

// ---------- PATCH /api/users/me/interests ----------
// Update interests and/or goals. Accepts arrays or comma-separated strings.
router.patch("/me/interests", verifyToken, async (req, res) => {
  try {
    const updates = {};

    if (req.body.interests !== undefined) {
      const interests = normalizeStringArray(req.body.interests);
      if (interests === undefined) {
        return res.status(400).json({ message: "interests must be an array or comma-separated string" });
      }
      updates.interests = interests.slice(0, 20); // cap at 20
    }

    if (req.body.goals !== undefined) {
      const goals = normalizeStringArray(req.body.goals);
      if (goals === undefined) {
        return res.status(400).json({ message: "goals must be an array or comma-separated string" });
      }
      updates.goals = goals.slice(0, 20);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Provide interests and/or goals" });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user: user.toSafeJSON() });
  } catch (error) {
    console.error("[PATCH /users/me/interests]", error);
    res.status(500).json({ message: "Failed to update interests", error: error.message });
  }
});

// ---------- PATCH /api/users/me/onboarding ----------
// Mark onboarding as complete after interests/goals are set.
router.patch("/me/onboarding", verifyToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { onboardingCompleted: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: user.toSafeJSON() });
  } catch (error) {
    console.error("[PATCH /users/me/onboarding]", error);
    res.status(500).json({ message: "Failed to complete onboarding", error: error.message });
  }
});

// ---------- PATCH /api/users/me/password ----------
// Change password. Requires current password.
router.patch("/me/password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.verifyPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    await user.setPassword(newPassword);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("[PATCH /users/me/password]", error);
    res.status(500).json({ message: "Failed to update password", error: error.message });
  }
});

// ---------- GET /api/users/:id ----------
// Public profile. Hides email, phone, and other private fields.
router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(req.params.id)
      .select("name role course year organizerProfile institution interests goals")
      .populate("institution", "name");

    if (!user) return res.status(404).json({ message: "User not found" });

    const publicProfile = {
      _id: user._id,
      name: user.name,
      role: user.role,
      course: user.course,
      year: user.year,
      interests: user.interests,
      goals: user.goals,
      organizerProfile: user.organizerProfile,
      institution: user.institution
    };

    res.json({ user: publicProfile });
  } catch (error) {
    console.error("[GET /users/:id]", error);
    res.status(500).json({ message: "Failed to fetch user", error: error.message });
  }
});

// ---------- DELETE /api/users/me ----------
// Delete own account. Cleans up registrations and cancels owned events first.
router.delete("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "authority") {
      const authorityCount = await User.countDocuments({
        institution: user.institution,
        role: "authority"
      });
      if (authorityCount <= 1) {
        return res.status(400).json({
          message: "You are the last authority in this institution. Transfer the role first."
        });
      }
    }

    const [regResult, eventResult] = await Promise.all([
      Registration.deleteMany({ user: user._id }),
      Event.updateMany(
        { organizer: user._id, status: { $in: ["pending", "approved"] } },
        { status: "rejected", rejectionReason: "Organizer account deleted" }
      )
    ]);

    await user.deleteOne();

    res.json({
      message: "Account deleted",
      cleanedUp: {
        registrations: regResult.deletedCount,
        eventsCancelled: eventResult.modifiedCount
      }
    });
  } catch (error) {
    console.error("[DELETE /users/me]", error);
    res.status(500).json({ message: "Failed to delete account", error: error.message });
  }
});

module.exports = router;