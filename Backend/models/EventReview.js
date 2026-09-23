const mongoose = require("mongoose");

// One review per event (1:1), created/updated by an authority user.
// This replaces the earlier "Report" model - a report only ever made
// sense in the context of a single event's approval decision.
const eventReviewSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, unique: true },
    authority: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    checklist: {
      titleClear: { type: Boolean, default: false },
      venueConfirmed: { type: Boolean, default: false },
      capacityReasonable: { type: Boolean, default: false },
      noConflict: { type: Boolean, default: false }
    },

    decision: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    notes: { type: String, trim: true },
    decidedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model("EventReview", eventReviewSchema);
