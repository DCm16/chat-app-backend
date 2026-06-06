const Message = require("../models/Message.model");
const Conversation = require("../models/Conversation.model");
const User = require("../models/User.model");
const { verifyToken } = require("../utils/jwt.utils");

const onlineUsers = new Map();

module.exports = (io) => {
  // ── Socket auth middleware ─────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication error"));

      const decoded = verifyToken(token);

      if (decoded?.id) {
        socket.senderType = "admin";
        socket.userId = decoded.id;
      } else if (decoded?.conversationId && decoded?.guestUsername) {
        socket.senderType = "guest";
        socket.conversationId = decoded.conversationId;
        socket.guestUsername = decoded.guestUsername;
      } else {
        return next(new Error("Invalid token payload"));
      }

      next();
    } catch {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const { senderType, userId, conversationId, guestUsername } = socket;

    if (!senderType) {
      socket.disconnect();
      return;
    }

    onlineUsers.set(socket.id, {
      senderType,
      userId,
      conversationId,
      guestUsername,
    });

    // ── room:join ──────────────────────────────────────────────────────
    socket.on("room:join", async (roomId) => {
      if (!roomId || typeof roomId !== "string") return;
      try {
        if (senderType === "guest") {
          if (roomId !== conversationId) {
            socket.emit("error", { message: "Access denied" });
            return;
          }
        }
        socket.join(roomId);
        socket.emit("room:joined", { room: roomId });
        socket.to(roomId).emit("room:user_joined", {
          senderType,
          username: senderType === "admin" ? null : guestUsername,
          room: roomId,
        });
        if (senderType === "admin") {
          await Message.updateMany(
            { conversation: roomId, senderType: "guest", readAt: null },
            { readAt: new Date() },
          );
          socket.emit("messages:read", { conversationId: roomId });
        }
      } catch (err) {
        console.error("❌ room:join error:", err.message);
      }
    });

    // ── room:leave ─────────────────────────────────────────────────────
    socket.on("room:leave", (roomId) => {
      if (!roomId) return;
      socket.leave(roomId);
      socket.to(roomId).emit("room:user_left", {
        senderType,
        username: guestUsername,
        room: roomId,
      });
    });

    // ── message:send ───────────────────────────────────────────────────
    socket.on("message:send", async ({ room, content }, callback) => {
      try {
        if (!room || !content?.trim())
          return callback?.({ error: "Invalid payload" });

        if (senderType === "guest" && room !== conversationId)
          return callback?.({ error: "Access denied" });

        const senderUsername =
          senderType === "admin"
            ? (await User.findById(userId).select("username"))?.username ||
              "Admin"
            : guestUsername;

        const message = await Message.create({
          conversation: room,
          senderType,
          senderUsername,
          content: content.trim(),
        });

        await Conversation.findByIdAndUpdate(room, {
          lastMessageAt: new Date(),
        });

        io.to(room).emit("message:new", message);
        callback?.({ success: true, message });
      } catch (err) {
        console.error("❌ message:send error:", err.message);
        callback?.({ error: err.message });
      }
    });

    // ── typing indicators ──────────────────────────────────────────────
    socket.on("typing:start", ({ room }) => {
      if (room)
        socket
          .to(room)
          .emit("typing:start", { senderType, username: guestUsername });
    });

    socket.on("typing:stop", ({ room }) => {
      if (room)
        socket
          .to(room)
          .emit("typing:stop", { senderType, username: guestUsername });
    });

    // ── message:delete ─────────────────────────────────────────────────
    socket.on("message:delete", async ({ messageId, room }, callback) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return callback?.({ error: "Not found" });

        const isAdmin = senderType === "admin" && msg.senderType === "admin";
        const isGuest =
          senderType === "guest" &&
          msg.senderType === "guest" &&
          msg.conversation.toString() === conversationId;

        if (!isAdmin && !isGuest) return callback?.({ error: "Forbidden" });

        msg.isDeleted = true;
        await msg.save();
        io.to(room).emit("message:deleted", { messageId });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    // ── call:start ─────────────────────────────────────────────────────
    // Caller notifies the other peer a call is incoming
    socket.on("call:start", ({ room, callType }) => {
      if (!room || !callType) return;
      if (senderType === "guest" && room !== conversationId) return;
      socket.to(room).emit("call:incoming", {
        from: socket.senderType,
        callType,
        roomId: room,
      });
    });

    // ── call:offer ─────────────────────────────────────────────────────
    // Caller sends SDP offer to receiver
    socket.on("call:offer", ({ room, offer }) => {
      if (!room || !offer) return;
      socket.to(room).emit("call:offer", { offer });
    });

    // ── call:answer ────────────────────────────────────────────────────
    // Receiver sends SDP answer back to caller
    socket.on("call:answer", ({ room, answer }) => {
      if (!room || !answer) return;
      socket.to(room).emit("call:answer", { answer });
    });

    // ── call:ice ───────────────────────────────────────────────────────
    // Both peers exchange ICE candidates
    socket.on("call:ice", ({ room, candidate }) => {
      if (!room || !candidate) return;
      socket.to(room).emit("call:ice", { candidate });
    });

    // ── call:end ───────────────────────────────────────────────────────
    // Either peer ends the call
    socket.on("call:end", ({ room }) => {
      if (!room) return;
      socket.to(room).emit("call:ended");
    });

    // ── call:reject ────────────────────────────────────────────────────
    // Receiver rejects the incoming call
    socket.on("call:reject", ({ room }) => {
      if (!room) return;
      socket.to(room).emit("call:rejected");
    });

    // ── call:screen-share ──────────────────────────────────────────────
    // Relay screen share state change to the other peer
    socket.on("call:screen-share", ({ room, active }) => {
      if (!room || typeof active !== "boolean") return;
      if (senderType === "guest" && room !== conversationId) return;
      socket.to(room).emit("call:screen-share", { active });
    });

    // ── disconnect ─────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      onlineUsers.delete(socket.id);

      // End any active call when peer disconnects
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.to(room).emit("call:ended");
        }
      });

      if (senderType === "admin" && userId) {
        const stillOnline = [...onlineUsers.values()].some(
          (u) => u.userId === userId,
        );
        if (!stillOnline) {
          try {
            await User.findByIdAndUpdate(userId, { isOnline: false });
            io.emit("user:offline", { userId });
          } catch (err) {
            console.error("❌ set offline failed:", err.message);
          }
        }
      }
    });

    // Set admin online on connect
    if (senderType === "admin" && userId) {
      User.findByIdAndUpdate(userId, { isOnline: true })
        .then(() => io.emit("user:online", { userId }))
        .catch((err) => console.error("❌ set online failed:", err.message));
    }
  });
};
