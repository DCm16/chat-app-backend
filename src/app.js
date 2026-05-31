const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const messageRoutes = require("./routes/message.routes");
const inviteRoutes = require("./routes/invite.routes");
const conversationRoutes = require("./routes/conversation.routes");
const guestRoutes = require("./routes/guest.routes");
const adminRoutes = require("./routes/admin.routes");
const seedRoutes = require("./routes/seed.routes");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/guest", guestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/seed", seedRoutes);

app.get("/health", (_, res) => res.json({ status: "ok" }));

module.exports = app;
