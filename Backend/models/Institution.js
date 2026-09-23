const mongoose = require("mongoose");

const institutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    domain: { type: String, trim: true, lowercase: true },
    authorityId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    city: String,
    logoUrl: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Institution", institutionSchema);