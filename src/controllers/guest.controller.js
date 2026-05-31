const InviteCode = require("../models/InviteCode.model");
const { signGuestToken } = require("../utils/jwt.utils");

// POST /api/guest/join
// Guest enters their 6-digit code and receives a token + conversation info
exports.joinWithCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code?.trim())
      return res.status(400).json({ message: "Code is required" });

    const inviteCode = await InviteCode.findOne({
      code: code.trim(),
      isActive: true,
    }).populate("conversation");

    if (!inviteCode)
      return res.status(404).json({ message: "Invalid or expired code" });

    const conversation = inviteCode.conversation;

    // Sign a guest token scoped to this conversation
    const token = signGuestToken(
      conversation._id.toString(),
      conversation.guestUsername
    );

    res.json({
      message: "Joined successfully",
      token,
      conversationId: conversation._id,
      guestUsername: conversation.guestUsername,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
