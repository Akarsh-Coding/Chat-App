import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:5000";

// Created once at module level, so re-renders never create a new socket.
// autoConnect: false means we connect manually inside useEffect,
// which is what lets the cleanup function work correctly.
export const socket = io(SERVER_URL, {
  autoConnect: false,
});