const User = require("../models/User.model");
const ActivityLog = require("../models/ActivityLog.model");

// GET /api/admin/users — list all admin accounts
exports.listAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json({ admins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/users — create a new admin account
exports.createAdmin = async (req, res) => {
  console.log("request", req.body);
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res
        .status(409)
        .json({ message: "Email or username already taken" });
    console.log("saving...");
    const user = await User.create({
      username,
      email,
      password,
      role: "admin",
    });

    await ActivityLog.create({
      performedBy: req.user._id,
      action: "admin_created",
      targetUser: user._id,
      meta: { username: user.username, email: user.email },
    });

    res.status(201).json({
      message: "Admin created",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isDisabled: user.isDisabled,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.log("error ni", err);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/users/:id/disable — disable an admin account
exports.disableAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "super-admin")
      return res.status(403).json({ message: "Cannot disable a super-admin" });

    user.isDisabled = true;
    await user.save();

    await ActivityLog.create({
      performedBy: req.user._id,
      action: "admin_disabled",
      targetUser: user._id,
      meta: { username: user.username },
    });

    res.json({ message: "Admin disabled", userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/users/:id/enable — re-enable an admin account
exports.enableAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isDisabled = false;
    await user.save();

    await ActivityLog.create({
      performedBy: req.user._id,
      action: "admin_enabled",
      targetUser: user._id,
      meta: { username: user.username },
    });

    res.json({ message: "Admin enabled", userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/logs — activity logs
exports.getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const logs = await ActivityLog.find()
      .populate("performedBy", "username email role")
      .populate("targetUser", "username email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await ActivityLog.countDocuments();
    res.json({ logs, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
