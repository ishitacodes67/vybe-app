const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // College email — derived from studentId (e.g., 2024cs001@mit.asia)
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // Raw student ID as entered (e.g., "2024CS001") — for display
    studentId: { type: String, trim: true, lowercase: true },

    // Personal Gmail for password reset delivery
    gmail: { type: String, trim: true, lowercase: true },

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

    organizerProfile: {
      orgName: { type: String, trim: true },
      verified: { type: Boolean, default: false }
    },

    // Password reset
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false }
  },
  { timestamps: true }
);

// ---------- Instance methods ----------

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.resetTokenHash;
  delete obj.resetTokenExpires;
  return obj;
};

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
  return this.passwordHash;
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);