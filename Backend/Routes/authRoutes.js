const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Institution = require("../models/Institution");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

function issueToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, institution: user.institution },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Find-or-create an institution by name. Returns ObjectId or undefined.
async function resolveInstitutionId({ institutionId, institutionName }) {
  if (institutionId) return institutionId;
  if (!institutionName) return undefined;

  const name = String(institutionName).trim();
  if (name.length < 2) return undefined;

  let inst = await Institution.findOne({ name });
  if (!inst) {
    // Generate a simple domain from the name (e.g. "MIT" -> "mit.edu")
    const domain = name.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".edu";
    inst = await Institution.create({ name, domain });
  }
  return inst._id;
}

// ---------- POST /api/auth/register ----------
router.post("/register", async (req, res) => {
  try {
    const {
      name, email, password, phone,
      course, year, role, orgName,
      institutionId, institutionName
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (role && !["member", "organizer", "authority"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const resolvedInstitution = await resolveInstitutionId({ institutionId, institutionName });

    const newUser = new User({
      name,
      email,
      phone,
      course: role === "member" || !role ? course : undefined,
      year: role === "member" || !role ? year : undefined,
      role: role || "member",
      institution: resolvedInstitution,
      organizerProfile: role === "organizer"
        ? { orgName, verified: false }
        : undefined
    });

    await newUser.setPassword(password);
    await newUser.save();

    res.status(201).json({
      user: newUser.toSafeJSON(),
      token: issueToken(newUser)
    });
  } catch (error) {
    console.error("[register]", error);
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

// ---------- POST /api/auth/login ----------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.verifyPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      user: user.toSafeJSON(),
      token: issueToken(user)
    });
  } catch (error) {
    console.error("[login]", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// ---------- GET /api/auth/me ----------
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user: user.toSafeJSON() });
  } catch (error) {
    console.error("[me]", error);
    res.status(500).json({ message: "Failed to fetch profile", error: error.message });
  }
});

module.exports = router;