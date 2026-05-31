const router = require("express").Router();
const { deleteMessage } = require("../controllers/message.controller");
const { protect, guestProtect } = require("../middlewares/auth.middleware");
const { verifyToken } = require("../utils/jwt.utils");

function flexAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  try {
    const decoded = verifyToken(authHeader.split(" ")[1]);
    if (decoded?.id) return protect(req, res, next);
    if (decoded?.conversationId) return guestProtect(req, res, next);
    return res.status(401).json({ message: "Invalid token" });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

router.delete("/:id", flexAuth, deleteMessage);

module.exports = router;
