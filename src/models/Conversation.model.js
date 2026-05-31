const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    adminUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    guestUsername: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Conversation", conversationSchema);
