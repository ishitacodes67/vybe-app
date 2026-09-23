const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true, lowercase: true }],

    // Keep as String "YYYY-MM-DD" to match the existing frontend format.
    // Lexicographic comparison works correctly for ISO dates.
    date: { type: String, required: true },
    endDate: { type: String }, // optional, "YYYY-MM-DD"
    time: { type: String, required: true },
    venue: { type: String, required: true, trim: true },

    mode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      default: "offline"
    },

    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true
    },

    price: { type: Number, default: 0, min: 0 },
    registrationMode: {
      type: String,
      enum: ["first-come", "approval"],
      default: "first-come"
    },
    capacity: { type: Number, required: true, min: 1 },
    registeredCount: { type: Number, default: 0, min: 0 },

    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    description: { type: String, trim: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    rejectionReason: { type: String, trim: true },

    // Lightweight embedded media refs. Cloudinary holds the file,
    // we store only the URL + metadata here.
    media: [
      {
        url: String,
        type: { type: String, enum: ["image", "video"] },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploaderRole: {
          type: String,
          enum: ["member", "organizer", "authority"]
        },
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // Cached text used by the AI service for embeddings.
    searchText: { type: String, select: false },

    // Placeholder for future Atlas Vector Search. Not used yet.
    embedding: { type: [Number], default: undefined, select: false }
  },
  { timestamps: true }
);

// Compound indexes for the common query patterns.
eventSchema.index({ institution: 1, date: 1, status: 1 });
eventSchema.index({ tags: 1, category: 1 });
eventSchema.index({ status: 1, date: 1 });

// Keep searchText in sync with the event's text fields on every save.
eventSchema.pre("save", function precomputeSearchText(next) {
  const tags = Array.isArray(this.tags) ? this.tags.join(" ") : "";
  this.searchText = [this.title, this.category, tags, this.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  next();
});

module.exports = mongoose.model("Event", eventSchema);