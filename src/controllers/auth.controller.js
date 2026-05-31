const User = require("../models/User.model");
const ActivityLog = require("../models/ActivityLog.model");
const { signToken } = require("../utils/jwt.utils");

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res
        .status(409)
        .json({ message: "Email or username already taken" });

    const user = await User.create({
      username,
      email,
      password,
      role: "admin",
    });
    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: "Invalid email or password" });

    if (user.isDisabled)
      return res
        .status(403)
        .json({
          message: "Your account has been disabled. Contact the super-admin.",
        });

    const token = signToken(user._id);

    // Log login activity
    await ActivityLog.create({
      performedBy: user._id,
      action: "admin_login",
      targetUser: user._id,
      meta: { email: user.email },
    });

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({
    user: {
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      isOnline: req.user.isOnline,
    },
  });
};
