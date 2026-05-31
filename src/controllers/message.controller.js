const Message = require("../models/Message.model");

// GET /api/conversations/:id/messages — handled in conversation controller
// DELETE /api/messages/:id — admin or guest can soft-delete their own message
exports.deleteMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    // Check ownership — admin or the guest of that conversation
    const isAdmin =
      req.user &&
      msg.senderType === "admin";
    const isGuest =
      req.guest &&
      msg.senderType === "guest" &&
      msg.conversation.toString() === req.guest.conversationId;

    if (!isAdmin && !isGuest)
      return res.status(403).json({ message: "Forbidden" });

    msg.isDeleted = true;
    await msg.save();
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
