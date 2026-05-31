const router = require("express").Router();
const { joinWithCode } = require("../controllers/guest.controller");

// No auth required — guest enters code to join
router.post("/join", joinWithCode);

module.exports = router;
