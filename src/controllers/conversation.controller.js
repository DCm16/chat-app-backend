const Conversation = require("../models/Conversation.model");
const Message = require("../models/Message.model");
const InviteCode = require("../models/InviteCode.model");

// GET /api/conversations
// Admin gets all their conversations with unread count + active code
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      adminUser: req.user._id,
    }).sort({ lastMessageAt: -1, createdAt: -1 });

    // Attach unread count and active code to each conversation
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          senderType: "guest",
          readAt: null,
          isDeleted: false,
        });

        const activeCode = await InviteCode.findOne({
          conversation: conv._id,
          isActive: true,
        }).select("code");

        return {
          ...conv.toObject(),
          unreadCount,
          activeCode: activeCode?.code || null,
        };
      }),
    );

    res.json({ conversations: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/conversations/:id/messages
// Get paginated messages for a conversation (admin or guest)
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({ conversation: id, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Mark guest messages as read when admin fetches
    if (req.user) {
      await Message.updateMany(
        { conversation: id, senderType: "guest", readAt: null },
        { readAt: new Date() },
      );
    }

    res.json({ messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/conversations/:id
// Admin archives a conversation
exports.archiveConversation = async (req, res) => {
  try {
    const conv = await Conversation.findOneAndUpdate(
      { _id: req.params.id, adminUser: req.user._id },
      { status: "archived" },
      { new: true },
    );

    if (!conv)
      return res.status(404).json({ message: "Conversation not found" });

    // Deactivate its invite code
    await InviteCode.updateMany(
      { conversation: conv._id },
      { isActive: false },
    );

    res.json({ message: "Conversation archived", conversation: conv });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/conversations/:id/info
// Lightweight endpoint — accessible by guest to get admin info for sidebar
exports.getConversationInfo = async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id).populate(
      "adminUser",
      "username isOnline",
    );

    if (!conv)
      return res.status(404).json({ message: "Conversation not found" });

    // Guest can only access their own conversation
    if (req.guest && req.guest.conversationId !== req.params.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json({ conversation: conv });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
