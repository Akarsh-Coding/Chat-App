import { useEffect, useState } from "react";
import { socket } from "./socket";

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // usernameInput = what's being typed on the join screen
  // username = the confirmed name, set only after joining
  const [usernameInput, setUsernameInput] = useState("");
  const [username, setUsername] = useState("");
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onChatMessage(payload) {
      setMessages((prev) => [...prev, payload]);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chat message", onChatMessage);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat message", onChatMessage);
      socket.disconnect();
    };
  }, []);

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

    socket.emit("chat message", { username, message, sentAt: Date.now() });
    setInput("");
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
        }}
      >
        {messages.length === 0 && <li style={{ opacity: 0.6 }}>No messages yet</li>}
        {messages.map((m, i) => (
          <li key={`${m.sentAt}-${i}`} style={{ marginBottom: 8 }}>
            [{m.username}]: {m.message}
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
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