const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

// Vite -> 5173, Create React App -> 3000
const CLIENT_ORIGIN = "http://localhost:5173";

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

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});