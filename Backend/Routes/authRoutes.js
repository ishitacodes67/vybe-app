const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Institution = require("../models/Institution");
const { verifyToken } = require("../middleware/auth");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimiters");
const crypto = require("crypto");
const { forgotPasswordLimiter } = require("../middleware/rateLimiters");
const { sendEmail } = require("../utils/mailer");

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
// Generate a random reset token + its SHA-256 hash.
function generateResetToken() {
  const raw = crypto.randomBytes(32).toString("hex"); // 64-char hex
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function hashResetToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
// ---------- POST /api/auth/register ----------
router.post("/register", registerLimiter, async (req, res) => {
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
router.post("/login", loginLimiter, async (req, res) => {
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
// ---------- POST /api/auth/forgot-password ----------
// Body: { email }
// Always returns 200 (even if email not found) to prevent enumeration.
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "A valid email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Generic response no matter what (prevents account enumeration)
    const genericResponse = {
      message: "If an account exists with that email, a reset link has been sent."
    };

    if (!user) {
      // Still return 200 — don't reveal whether the email exists
      return res.json(genericResponse);
    }

    // Generate token
    const { raw, hash } = generateResetToken();
    const expiresMinutes = Number(process.env.RESET_TOKEN_EXPIRES_MINUTES) || 60;
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    user.resetTokenHash = hash;
    user.resetTokenExpires = expiresAt;
    await user.save();

    // Build reset URL
    const frontend = process.env.FRONTEND_URL || "http://localhost:5500";
    const resetUrl = `${frontend}/reset-password.html?token=${raw}`;

    // Send email (falls back to console log if no Resend key)
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f7f7f4;">
        <h1 style="font-size:32px;font-weight:800;letter-spacing:-0.02em;">VYBE<span style="color:#a3e635;">✦</span></h1>
        <p style="font-size:16px;color:#333;">Hey ${user.name || "there"},</p>
        <p style="font-size:16px;color:#333;">Someone requested a password reset for your VYBE account. Click the button below to set a new password. This link expires in ${expiresMinutes} minutes.</p>
        <p style="margin:28px 0;">
          <a href="${resetUrl}" style="background:#000;color:#fff;padding:14px 24px;text-decoration:none;border-radius:999px;font-weight:700;display:inline-block;">Reset my password →</a>
        </p>
        <p style="font-size:13px;color:#666;">If you didn't request this, you can safely ignore this email.</p>
        <p style="font-size:12px;color:#999;word-break:break-all;margin-top:32px;">Or paste this into your browser:<br>${resetUrl}</p>
      </div>
    `;

    const text = `Reset your VYBE password: ${resetUrl} (expires in ${expiresMinutes} minutes)`;

    await sendEmail({
      to: user.email,
      subject: "Reset your VYBE password",
      html,
      text
    });

    res.json(genericResponse);
  } catch (error) {
    console.error("[forgot-password]", error);
    res.status(500).json({ message: "Failed to process request", error: error.message });
  }
});

// ---------- POST /api/auth/reset-password/:token ----------
// Body: { newPassword }
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Invalid or missing reset token" });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const hash = hashResetToken(token);

    // Find user with this token that hasn't expired yet
    const user = await User.findOne({
      resetTokenHash: hash,
      resetTokenExpires: { $gt: new Date() }
    }).select("+resetTokenHash +resetTokenExpires");

    if (!user) {
      return res.status(400).json({
        message: "This reset link is invalid or has expired. Please request a new one."
      });
    }

    // Update password + clear reset fields
    await user.setPassword(newPassword);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    res.json({ message: "Password updated successfully. You can now log in." });
  } catch (error) {
    console.error("[reset-password]", error);
    res.status(500).json({ message: "Failed to reset password", error: error.message });
  }
});
module.exports = router;