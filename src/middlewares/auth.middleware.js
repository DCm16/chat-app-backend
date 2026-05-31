const { verifyToken } = require("../utils/jwt.utils");
const User = require("../models/User.model");

// Admin middleware — any logged-in user (admin or super-admin)
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded?.id)
      return res.status(401).json({ message: "Invalid token payload" });

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });
    if (user.isDisabled)
      return res.status(403).json({ message: "Account disabled" });

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Super-admin only middleware
const superAdminProtect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded?.id)
      return res.status(401).json({ message: "Invalid token payload" });

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });
    if (user.isDisabled)
      return res.status(403).json({ message: "Account disabled" });
    if (user.role !== "super-admin")
      return res.status(403).json({ message: "Super-admin access required" });

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Guest middleware
const guestProtect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded?.conversationId || !decoded?.guestUsername)
      return res.status(401).json({ message: "Invalid guest token" });

    req.guest = {
      conversationId: decoded.conversationId,
      username: decoded.guestUsername,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { protect, superAdminProtect, guestProtect };
