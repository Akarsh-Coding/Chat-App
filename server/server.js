const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

// Vite -> 5173, Create React App -> 3000
const CLIENT_ORIGIN = "http://localhost:5175";        // ------------------ Change this to your client origin if different -------------------------

// CORS for normal HTTP routes
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// Simple route to confirm Express is working
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Wrap Express in a raw HTTP server so Socket.io can share the port
const server = http.createServer(app);

// WebSocket CORS is configured separately from Express CORS
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

const ROOMS = ["General", "Tech Support"];

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // ---- Join / switch room ----
  socket.on("join room", (payload) => {
    const room = payload?.room;
    if (!ROOMS.includes(room)) return; // only known rooms are allowed

    const previousRoom = socket.data.room;
    if (previousRoom === room) return; // already there

    if (previousRoom) {
      // Clear their typing indicator in the room they're leaving
      if (socket.data.typingUser) {
        socket.to(previousRoom).emit("stop typing", {
          username: socket.data.typingUser,
          room: previousRoom,
        });
        socket.data.typingUser = null;
      }
      socket.leave(previousRoom);
    }

    socket.join(room);
    socket.data.room = room;
    console.log(`${socket.id} joined "${room}"${previousRoom ? ` (left "${previousRoom}")` : ""}`);
  });

  // ---- Messages: only to clients subscribed to that room ----
  socket.on("chat message", (payload) => {
    if (!payload || !payload.username || !payload.message || !payload.room) return;
    if (!socket.rooms.has(payload.room)) return; // sender must be in the room

    console.log(`(${payload.room}) [${payload.username}]: ${payload.message}`);
    io.to(payload.room).emit("chat message", payload);
  });

  // ---- Typing: room-scoped AND excludes the sender ----
  socket.on("typing", (payload) => {
    if (!payload?.username || !socket.rooms.has(payload.room)) return;
    socket.data.typingUser = payload.username;
    socket.to(payload.room).emit("typing", {
      username: payload.username,
      room: payload.room,
    });
  });

  socket.on("stop typing", (payload) => {
    if (!payload?.username || !socket.rooms.has(payload.room)) return;
    socket.data.typingUser = null;
    socket.to(payload.room).emit("stop typing", {
      username: payload.username,
      room: payload.room,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);

    // If they vanished mid-typing, clear the indicator in their room
    if (socket.data.typingUser && socket.data.room) {
      io.to(socket.data.room).emit("stop typing", {
        username: socket.data.typingUser,
        room: socket.data.room,
      });
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});