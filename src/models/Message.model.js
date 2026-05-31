const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderType: {
      type: String,
      enum: ["admin", "guest"],
      required: true,
    },
    senderUsername: {
      type: String,
      required: true,
      trim: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    readAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Message", messageSchema);
