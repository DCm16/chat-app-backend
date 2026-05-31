const router = require("express").Router();
const {
  listAdmins,
  createAdmin,
  disableAdmin,
  enableAdmin,
  getActivityLogs,
} = require("../controllers/admin.controller");
const { superAdminProtect } = require("../middlewares/auth.middleware");

// Pass superAdminProtect directly to each route instead of router.use()
// Express 5 handles per-route middleware more reliably than router.use() with async
router.get("/users", superAdminProtect, listAdmins);
router.post("/users", superAdminProtect, createAdmin);
router.patch("/users/:id/disable", superAdminProtect, disableAdmin);
router.patch("/users/:id/enable", superAdminProtect, enableAdmin);
router.get("/logs", superAdminProtect, getActivityLogs);

module.exports = router;
