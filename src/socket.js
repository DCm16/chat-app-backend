const { Server } = require("socket.io");
const chatHandler = require("./sockets/chat.handler");

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket"], // ← force websocket only
    allowUpgrades: false, // ← prevent transport switching
  });
  chatHandler(io);
  return io;
};

module.exports = initSocket;
