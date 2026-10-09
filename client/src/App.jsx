import { useEffect, useRef, useState } from "react";
import { socket } from "./socket";

const ROOMS = ["General", "Tech Support"];
const DEFAULT_ROOM = "General";
const TYPING_IDLE_MS = 1500;

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [usernameInput, setUsernameInput] = useState("");
  const [username, setUsername] = useState("");
  const [joinError, setJoinError] = useState("");

  const [room, setRoom] = useState(""); // "" until the user has joined the chat
  const [typingUsers, setTypingUsers] = useState([]);

  // roomRef mirrors `room` so socket listeners (registered once) always see the current room
  const roomRef = useRef("");
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      // After a reconnect (e.g. server restart) the server has forgotten our room, so rejoin
      if (roomRef.current) {
        socket.emit("join room", { room: roomRef.current });
      }
    }

    function onDisconnect() {
      setIsConnected(false);
      setTypingUsers([]);
    }

    function onChatMessage(payload) {
      // Safety net: ignore anything not for the room we're currently viewing
      if (payload.room !== roomRef.current) return;
      setMessages((prev) => [...prev, payload]);
    }

    function onTyping({ username: name, room: msgRoom }) {
      if (msgRoom !== roomRef.current) return;
      setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
    }

    function onStopTyping({ username: name, room: msgRoom }) {
      if (msgRoom !== roomRef.current) return;
      setTypingUsers((prev) => prev.filter((n) => n !== name));
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chat message", onChatMessage);
    socket.on("typing", onTyping);
    socket.on("stop typing", onStopTyping);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat message", onChatMessage);
      socket.off("typing", onTyping);
      socket.off("stop typing", onStopTyping);
      clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
    };
  }, []);

  function stopTyping() {
    clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit("stop typing", { username, room: roomRef.current });
    }
  }

  function switchRoom(newRoom) {
    if (newRoom === roomRef.current) return;

    stopTyping(); // clear our indicator in the OLD room first

    roomRef.current = newRoom;
    setRoom(newRoom);
    setMessages([]); // fresh list for the new room
    setTypingUsers([]);

    if (socket.connected) {
      socket.emit("join room", { room: newRoom });
    }
    // If not connected yet, onConnect will send "join room" once the socket is up
  }

  function handleInputChange(e) {
    const value = e.target.value;
    setInput(value);

    if (!value.trim()) {
      stopTyping();
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", { username, room: roomRef.current });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  }

  function joinChat() {
    const name = usernameInput.trim();
    if (!name) {
      setJoinError("Username is required to enter the chat.");
      return;
    }
    setJoinError("");
    setUsername(name);
    switchRoom(DEFAULT_ROOM);
  }

  function sendMessage() {
    const message = input.trim();
    if (!message || !isConnected) return;

    stopTyping();
    socket.emit("chat message", {
      username,
      message,
      room: roomRef.current,
      sentAt: Date.now(),
    });
    setInput("");
  }

  function typingText() {
    if (typingUsers.length === 0) return "";
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    return "Several people are typing...";
  }

  const statusLine = (
    <p>
      Status:{" "}
      <strong style={{ color: isConnected ? "green" : "crimson" }}>
        {isConnected ? "Connected" : "Disconnected"}
      </strong>
    </p>
  );

  // ---------- Join screen ----------
  if (!username) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Real-Time Chat</h1>
        {statusLine}

        <h2>Choose a username</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinChat()}
            placeholder="e.g. Nakul"
            maxLength={20}
            autoFocus
            style={{ flex: 1, padding: "0.6rem", fontSize: "1rem" }}
          />
          <button onClick={joinChat} style={{ padding: "0.6rem 1.2rem" }}>
            Join Chat
          </button>
        </div>
        {joinError && <p style={{ color: "crimson" }}>{joinError}</p>}
      </div>
    );
  }

  // ---------- Chat screen ----------
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Real-Time Chat</h1>
      {statusLine}
      <p>
        Chatting as <strong>{username}</strong> in <strong>{room}</strong>
      </p>

      {/* Room tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {ROOMS.map((r) => (
          <button
            key={r}
            onClick={() => switchRoom(r)}
            style={{
              padding: "0.5rem 1rem",
              fontWeight: r === room ? "bold" : "normal",
              border: r === room ? "2px solid #3b82f6" : "1px solid #888",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {r}
          </button>
        ))}
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: "1rem",
          height: 300,
          overflowY: "auto",
          border: "1px solid #888",
          borderRadius: 8,
          textAlign: "left",
          margin: 0,
        }}
      >
        {messages.length === 0 && <li style={{ opacity: 0.6 }}>No messages in {room} yet</li>}
        {messages.map((m, i) => (
          <li key={`${m.sentAt}-${i}`} style={{ marginBottom: 8 }}>
            [{m.username}]: {m.message}
          </li>
        ))}
      </ul>

      <div style={{ height: 24, marginTop: 6, fontStyle: "italic", opacity: 0.7, textAlign: "left" }}>
        {typingText()}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={`Message #${room}...`}
          style={{ flex: 1, padding: "0.6rem", fontSize: "1rem" }}
        />
        <button onClick={sendMessage} disabled={!isConnected} style={{ padding: "0.6rem 1.2rem" }}>
          Send
        </button>
      </div>
    </div>
  );
}

export default App;