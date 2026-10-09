import { io } from "socket.io-client";

// Set VITE_SOCKET_URL in Vercel. Falls back to localhost for local dev.
const SERVER_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const socket = io(SERVER_URL, {
  autoConnect: false,
});