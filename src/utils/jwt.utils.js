const jwt = require("jsonwebtoken");

// Admin token — contains user id
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// Guest token — contains conversationId + guestUsername (no user account)
const signGuestToken = (conversationId, guestUsername) =>
  jwt.sign({ conversationId, guestUsername }, process.env.JWT_SECRET, {
    expiresIn: process.env.GUEST_JWT_EXPIRES_IN || "7d",
  });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = { signToken, signGuestToken, verifyToken };
