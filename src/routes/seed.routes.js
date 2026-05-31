const router = require("express").Router();
const { seedSuperAdmin } = require("../controllers/seed.controller");

router.post("/superadmin", seedSuperAdmin);

module.exports = router;
