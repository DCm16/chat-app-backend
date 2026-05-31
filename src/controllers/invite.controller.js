const Conversation = require("../models/Conversation.model");
const InviteCode = require("../models/InviteCode.model");
const InviteCodeHistory = require("../models/InviteCodeHistory.model");

// Generate a unique 6-digit numeric code
async function generateUniqueCode() {
  let code, exists;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    exists = await InviteCode.findOne({ code, isActive: true });
  } while (exists);
  return code;
}

// POST /api/invites
// Admin creates a conversation + invite code for a guest username
exports.createInvite = async (req, res) => {
  try {
    const { guestUsername } = req.body;
    if (!guestUsername?.trim())
      return res.status(400).json({ message: "guestUsername is required" });

    // Create the conversation
    const conversation = await Conversation.create({
      adminUser: req.user._id,
      guestUsername: guestUsername.trim(),
    });

    // Generate and store the invite code
    const code = await generateUniqueCode();
    const inviteCode = await InviteCode.create({
      adminUser: req.user._id,
      conversation: conversation._id,
      code,
    });

    res.status(201).json({
      message: "Invite created",
      code: inviteCode.code,
      conversationId: conversation._id,
      guestUsername: conversation.guestUsername,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/invites/:conversationId/refresh
// Admin refreshes the code for a conversation — old code deactivated, new one created
exports.refreshInvite = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Find the current active code
    const currentCode = await InviteCode.findOne({
      conversation: conversationId,
      isActive: true,
    });

    if (!currentCode)
      return res.status(404).json({ message: "No active invite code found" });

    // Deactivate the old code
    currentCode.isActive = false;
    await currentCode.save();

    // Generate new code
    const newCodeValue = await generateUniqueCode();
    const newCode = await InviteCode.create({
      adminUser: req.user._id,
      conversation: conversationId,
      code: newCodeValue,
    });

    // Log to history
    await InviteCodeHistory.create({
      inviteCode: currentCode._id,
      conversation: conversationId,
      oldCode: currentCode.code,
      newCode: newCodeValue,
    });

    res.json({
      message: "Code refreshed",
      code: newCode.code,
      conversationId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/invites
// Admin gets all active invite codes with conversation info
exports.getInvites = async (req, res) => {
  try {
    const invites = await InviteCode.find({
      adminUser: req.user._id,
      isActive: true,
    }).populate("conversation", "guestUsername status lastMessageAt createdAt");

    res.json({ invites });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/invites/:conversationId/history
// Admin gets code change history for a conversation
exports.getInviteHistory = async (req, res) => {
  try {
    const history = await InviteCodeHistory.find({
      conversation: req.params.conversationId,
    }).sort({ changedAt: -1 });

    res.json({ history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
