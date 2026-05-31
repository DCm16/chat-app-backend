const User = require("../models/User.model");

exports.seedSuperAdmin = async (req, res) => {
  try {
    const exists = await User.findOne({ role: "super-admin" });
    if (exists) return res.status(404).json({ message: "Not found" });

    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    await User.create({ username, email, password, role: "super-admin" });

    res.status(201).json({ message: "Super admin created" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
