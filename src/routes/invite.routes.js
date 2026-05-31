const router = require("express").Router();
const {
  createInvite,
  refreshInvite,
  getInvites,
  getInviteHistory,
} = require("../controllers/invite.controller");
const { protect } = require("../middlewares/auth.middleware");

// Pass protect directly to each route instead of router.use()
router.get("/", protect, getInvites);
router.post("/", protect, createInvite);
router.put("/:conversationId/refresh", protect, refreshInvite);
router.get("/:conversationId/history", protect, getInviteHistory);

module.exports = router;
