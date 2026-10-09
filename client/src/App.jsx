import { useEffect, useState } from "react";
import { socket } from "./socket";

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Connect on mount
    socket.connect();

    // Cleanup: runs on unmount, and between StrictMode's double-invoke in dev
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Real-Time Chat</h1>
      <p>
        Status:{" "}
        <strong style={{ color: isConnected ? "green" : "crimson" }}>
          {isConnected ? "Connected" : "Disconnected"}
        </strong>
      </p>
    </div>
  );
}

export default App;