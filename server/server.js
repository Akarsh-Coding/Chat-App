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

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("chat message", (payload) => {
    if (!payload || !payload.username || !payload.message) return;

    console.log(`[${payload.username}]: ${payload.message}`);
    io.emit("chat message", payload);
  });

  // Typing events go to everyone EXCEPT the sender (socket.broadcast.emit)
  socket.on("typing", (username) => {
    if (typeof username !== "string" || !username) return;
    socket.data.typingUser = username; // remembered so we can clean up on disconnect
    socket.broadcast.emit("typing", username);
  });

  socket.on("stop typing", (username) => {
    if (typeof username !== "string" || !username) return;
    socket.data.typingUser = null;
    socket.broadcast.emit("stop typing", username);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);

    // If they vanished mid-typing, clear their indicator for everyone else
    if (socket.data.typingUser) {
      io.emit("stop typing", socket.data.typingUser);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});