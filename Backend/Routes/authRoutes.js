const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Institution = require("../models/Institution");
const { verifyToken } = require("../middleware/auth");
const { loginLimiter, registerLimiter, forgotPasswordLimiter } = require("../middleware/rateLimiters");
const { sendEmail } = require("../utils/mailer");
const crypto = require("crypto");

const router = express.Router();

// ---------- College email domain ----------
const ALLOWED_EMAIL_DOMAINS = ["mit.asia", "mit.edu"];
const PRIMARY_DOMAIN = "mit.asia";

function isCollegeEmail(email) {
  if (!email || typeof email !== "string") return false;
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

function emailDomainError() {
  return {
    message: `Only college emails are allowed (${ALLOWED_EMAIL_DOMAINS.map(d => "@" + d).join(", ")}).`
  };
}

// ---------- Student ID → email ----------
// "2024CS001" → "2024cs001@mit.asia"
// "2024cs001@mit.asia" → "2024cs001@mit.asia" (unchanged)
function toEmailFromIdentifier(identifier) {
  const cleaned = String(identifier || "").trim().toLowerCase();
  if (!cleaned) return "";
  if (cleaned.includes("@")) return cleaned;
  return `${cleaned}@${PRIMARY_DOMAIN}`;
}

// "2024CS001" → "2024cs001"
function normalizeStudentId(id) {
  return String(id || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ---------- Helpers ----------
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

function isValidGmail(email) {
  if (!email) return true; // optional
  return /^[^\s@]+@gmail\.com$/.test(String(email).trim().toLowerCase());
}

async function resolveInstitutionId({ institutionId, institutionName }) {
  if (institutionId) return institutionId;
  if (!institutionName) return undefined;

  const name = String(institutionName).trim();
  if (name.length < 2) return undefined;

  let inst = await Institution.findOne({ name });
  if (!inst) {
    const domain = name.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".edu";
    inst = await Institution.create({ name, domain });
  }
  return inst._id;
}

function generateResetToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function hashResetToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ---------- POST /api/auth/register ----------
// Body: { name, studentId, gmail, password, role?, institutionName? }
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const {
      name, studentId, gmail, password,
      phone, course, year, role, orgName,
      institutionId, institutionName
    } = req.body;

    // ---- Validation ----
    if (!name || !studentId || !password) {
      return res.status(400).json({ message: "name, studentId and password are required" });
    }

    const normStudentId = normalizeStudentId(studentId);
    if (normStudentId.length < 3) {
      return res.status(400).json({ message: "Student ID must be at least 3 characters (letters + numbers)" });
    }

    if (gmail && !isValidGmail(gmail)) {
      return res.status(400).json({ message: "Gmail must end with @gmail.com" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (role && !["member", "organizer", "authority"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Build the college email from student ID
    const email = toEmailFromIdentifier(normStudentId);

    const existing = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { studentId: normStudentId }
      ]
    });
    if (existing) {
      return res.status(409).json({
        message: "An account with this Student ID already exists. Try logging in."
      });
    }

    const resolvedInstitution = await resolveInstitutionId({ institutionId, institutionName });

    const newUser = new User({
      name,
      email,
      studentId: normStudentId,
      gmail: gmail ? gmail.trim().toLowerCase() : undefined,
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
// Body: { identifier, password }   (identifier = studentId OR full college email)
// Also accepts { studentId, password } or { email, password }
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    // Support multiple field names for backwards-compat
    const identifier = req.body.identifier || req.body.studentId || req.body.email;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Student ID and password are required" });
    }

    const email = toEmailFromIdentifier(identifier);

    if (!isCollegeEmail(email)) {
      return res.status(400).json(emailDomainError());
    }

    // Try email first, then studentId (in case of migration)
    const normId = normalizeStudentId(identifier);
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { studentId: normId }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid Student ID or password" });
    }

    const isMatch = await user.verifyPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Student ID or password" });
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
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const { identifier, email, studentId } = req.body;
    const input = identifier || email || studentId;

    if (!input) {
      return res.status(400).json({ message: "Student ID or Gmail is required" });
    }

    const genericResponse = {
      message: "If an account exists, a reset link has been sent to the registered Gmail."
    };

    const normId = normalizeStudentId(input);
    const asEmail = toEmailFromIdentifier(input).toLowerCase();

    const user = await User.findOne({
      $or: [
        { email: asEmail },
        { studentId: normId },
        { gmail: String(input).trim().toLowerCase() }
      ]
    });

    if (!user) {
      return res.json(genericResponse);
    }

    const { raw, hash } = generateResetToken();
    const expiresMinutes = Number(process.env.RESET_TOKEN_EXPIRES_MINUTES) || 60;
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    user.resetTokenHash = hash;
    user.resetTokenExpires = expiresAt;
    await user.save();

    const frontend = process.env.FRONTEND_URL || "http://localhost:5500";
    const resetUrl = `${frontend}/reset-password.html?token=${raw}`;

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f7f7f4;">
        <h1 style="font-size:32px;font-weight:800;letter-spacing:-0.02em;">VYBE<span style="color:#a3e635;">✦</span></h1>
        <p style="font-size:16px;color:#333;">Hey ${user.name || "there"},</p>
        <p style="font-size:16px;color:#333;">Someone requested a password reset for your VYBE account (Student ID: <strong>${user.studentId || user.email}</strong>). Click the button below to set a new password. This link expires in ${expiresMinutes} minutes.</p>
        <p style="margin:28px 0;">
          <a href="${resetUrl}" style="background:#000;color:#fff;padding:14px 24px;text-decoration:none;border-radius:999px;font-weight:700;display:inline-block;">Reset my password →</a>
        </p>
        <p style="font-size:13px;color:#666;">If you didn't request this, you can safely ignore this email.</p>
        <p style="font-size:12px;color:#999;word-break:break-all;margin-top:32px;">Or paste this into your browser:<br>${resetUrl}</p>
      </div>
    `;

    const text = `Reset your VYBE password: ${resetUrl} (expires in ${expiresMinutes} minutes)`;

    // Prefer Gmail for delivery
    const deliveryEmail = user.gmail || user.email;

    await sendEmail({
      to: deliveryEmail,
      subject: "Reset your VYBE password",
      html,
      text
    });

    console.log(`[forgot-password] Reset link sent to ${deliveryEmail} (user: ${user.email})`);

    res.json(genericResponse);
  } catch (error) {
    console.error("[forgot-password]", error);
    res.status(500).json({ message: "Failed to process request", error: error.message });
  }
});

// ---------- POST /api/auth/reset-password/:token ----------
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

    const user = await User.findOne({
      resetTokenHash: hash,
      resetTokenExpires: { $gt: new Date() }
    }).select("+resetTokenHash +resetTokenExpires");

    if (!user) {
      return res.status(400).json({
        message: "This reset link is invalid or has expired. Please request a new one."
      });
    }

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