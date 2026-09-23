const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["member", "organizer", "authority"],
      default: "member"
    },

    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution" },

    // Member-only fields
    course: { type: String, trim: true },
    year: { type: String, trim: true },
    interests: [{ type: String, trim: true, lowercase: true }],
    goals: [{ type: String, trim: true, lowercase: true }],
    onboardingCompleted: { type: Boolean, default: false },

    // Present only when role === "organizer"
      organizerProfile: {
      orgName: { type: String, trim: true },
      verified: { type: Boolean, default: false }
    },

    // Password reset (hashed token + expiry)
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false }
  },

// ---------- Instance methods ----------

// Returns the user object without the sensitive passwordHash field
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

// Hashes a plain-text password and stores it on this document.
// Call this before .save() when creating or updating a password.
userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
  return this.passwordHash;
};

// Compares a plain-text password against the stored hash.
// Returns true if it matches, false otherwise.
userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);