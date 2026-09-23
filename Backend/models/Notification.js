const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info"
    },

    // Optional deep-link target, e.g. "/events/abc123"
    link: { type: String, trim: true },

    // Socket.io-ready fields (unused for now, polling only)
    channel: { type: String },
    eventName: { type: String, default: "notification:new" },

    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);