const mongoose = require("mongoose");

const inviteCodeSchema = new mongoose.Schema(
  {
    adminUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    code: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Only one active code per conversation
inviteCodeSchema.index({ conversation: 1, isActive: 1 });

module.exports = mongoose.model("InviteCode", inviteCodeSchema);
