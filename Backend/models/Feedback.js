const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 1000 },
    edited: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// One feedback per user per event
feedbackSchema.index({ user: 1, event: 1 }, { unique: true });

// Fast aggregate lookup by event
feedbackSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model("Feedback", feedbackSchema);