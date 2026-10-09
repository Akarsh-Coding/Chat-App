import { useEffect, useState } from "react";
import { socket } from "./socket";

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

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

  function sendMessage() {
    const text = input.trim();
    if (!text || !isConnected) return;

    socket.emit("chat message", { text, sentAt: Date.now() });
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") sendMessage();
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Real-Time Chat</h1>
      <p>
        Status:{" "}
        <strong style={{ color: isConnected ? "green" : "crimson" }}>
          {isConnected ? "Connected" : "Disconnected"}
        </strong>
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
            {m.text}
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
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