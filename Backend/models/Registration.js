const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "cancelled"],
      default: "confirmed"
    },
    note: { type: String, trim: true, maxlength: 500 },
    cancelledAt: Date,
    decidedAt: Date,   // when organizer approved or rejected
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

// A user can register once per event
registrationSchema.index({ user: 1, event: 1 }, { unique: true });

// Fast lookups for organizer dashboards
registrationSchema.index({ event: 1, status: 1 });
registrationSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("Registration", registrationSchema);