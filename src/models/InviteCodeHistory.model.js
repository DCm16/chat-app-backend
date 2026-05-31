const mongoose = require("mongoose");

const inviteCodeHistorySchema = new mongoose.Schema({
  inviteCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InviteCode",
    required: true,
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
  },
  oldCode: { type: String, required: true },
  newCode: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("InviteCodeHistory", inviteCodeHistorySchema);
