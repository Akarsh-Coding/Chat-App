import { useEffect, useRef, useState } from "react";
import { socket } from "./socket";

const TYPING_IDLE_MS = 1500;

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [usernameInput, setUsernameInput] = useState("");
  const [username, setUsername] = useState("");
  const [joinError, setJoinError] = useState("");

  // Usernames of OTHER people currently typing
  const [typingUsers, setTypingUsers] = useState([]);

  // Refs hold values that must not trigger re-renders
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
      setTypingUsers([]); // stale indicators make no sense while offline
    }

    function onChatMessage(payload) {
      setMessages((prev) => [...prev, payload]);
    }

    function onTyping(name) {
      setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
    }

    function onStopTyping(name) {
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
      socket.emit("stop typing", username);
    }
  }

  function handleInputChange(e) {
    const value = e.target.value;
    setInput(value);

    // Empty input -> stop immediately
    if (!value.trim()) {
      stopTyping();
      return;
    }

    // Only emit "typing" once per burst, not on every keystroke
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", username);
    }

    // Debounce: restart the idle timer on every keystroke
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
  }

  function sendMessage() {
    const message = input.trim();
    if (!message || !isConnected) return;

    stopTyping(); // sending ends the typing state
    socket.emit("chat message", { username, message, sentAt: Date.now() });
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
        Chatting as <strong>{username}</strong>
      </p>

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
        {messages.length === 0 && <li style={{ opacity: 0.6 }}>No messages yet</li>}
        {messages.map((m, i) => (
          <li key={`${m.sentAt}-${i}`} style={{ marginBottom: 8 }}>
            [{m.username}]: {m.message}
          </li>
        ))}
      </ul>

      {/* Fixed height so the layout doesn't jump when the indicator appears */}
      <div style={{ height: 24, marginTop: 6, fontStyle: "italic", opacity: 0.7, textAlign: "left" }}>
        {typingText()}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
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