# Real-Time Chat

A real-time chat application built with **Socket.io**, **Node.js/Express** and **React (Vite)**. Users pick a username, join one of two rooms, exchange messages instantly, and see live typing indicators.

## Live Demo

- **Frontend (Vercel):** `https://your-app.vercel.app`
- **Backend (Render):** `https://your-backend.onrender.com`

> The backend runs on a free tier that can go to sleep when idle. The first connection may take up to a minute while it wakes up. The status indicator shows "Disconnected" until then.

## Features

- **Persistent WebSocket connection** with a visible Connected / Disconnected status indicator
- **Username gate:** empty or whitespace-only names are blocked
- **Real-time messaging** formatted as `[Username]: message`, with the sender seeing their own message
- **Typing indicator:** "Nakul is typing..." appears for everyone else in the room, and clears on idle, on empty input, on send, on room switch and on disconnect
- **Rooms:** "General" and "Tech Support", switched with tabs. Messages and typing events stay inside their room.
- **Automatic rejoin** of the current room after a reconnect
- **React 18 StrictMode safe:** one live connection per tab, with listener and socket cleanup in `useEffect`

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, socket.io-client |
| Backend | Node.js, Express, Socket.io, cors, dotenv |
| Hosting | Vercel (frontend), Render (backend) |

## Project Structure

```
chat-app/
├── client/              React + Vite frontend
│   ├── src/
│   │   ├── App.jsx      Chat UI and event handling
│   │   └── socket.js    Single shared socket instance
│   ├── .env.example
│   └── package.json
├── server/              Express + Socket.io backend
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── README.md
```

## Getting Started (Local)

### Prerequisites

- Node.js 18.11 or later
- npm

### 1. Backend

```bash
cd server
npm install
cp .env.example .env     # then edit the values (see below)
npm run dev
```

The server starts on `http://localhost:5000`. Opening it in a browser should show "Server is running".

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
cp .env.example .env.local   # then edit the value (see below)
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`.

## Environment Variables

### Server (`server/.env`)

| Variable | Description | Example |
|---|---|---|
| `CLIENT_ORIGIN` | Allowed frontend origin(s) for CORS. Comma-separated for several. No trailing slash. | `http://localhost:5173` |
| `PORT` | Port to listen on. Hosting platforms set this automatically. | `5000` |

> If Vite starts on a different port (for example 5175 because 5173 is busy), set `CLIENT_ORIGIN` to match, or the browser will block the connection.

### Client (`client/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `VITE_SOCKET_URL` | URL of the Socket.io backend. Falls back to `http://localhost:5000`. | `https://your-backend.onrender.com` |

Vite embeds environment variables at build time, so redeploy the frontend after changing this value.

## Socket Events

| Event | Direction | Payload | Behavior |
|---|---|---|---|
| `join room` | client → server | `{ room }` | Leaves the previous room and joins the new one. Only known rooms are accepted. |
| `chat message` | client → server | `{ username, message, room, sentAt }` | Server checks the sender is in the room. |
| `chat message` | server → room | same as above | Sent with `io.to(room).emit`, including the sender. |
| `typing` | client → server | `{ username, room }` | Relayed to the room with `socket.to(room).emit`, excluding the sender. |
| `stop typing` | client → server | `{ username, room }` | Same relay as `typing`. |

## Deployment

### Backend on Render

1. Create a new **Web Service** from this repository.
2. Set **Root Directory** to `server`, **Build Command** to `npm install`, and **Start Command** to `npm start`.
3. Add the environment variable `CLIENT_ORIGIN` with your Vercel URL.

### Frontend on Vercel

1. Import the repository as a new project.
2. Set **Root Directory** to `client`.
3. Add the environment variable `VITE_SOCKET_URL` with your Render URL (`https://`, no trailing slash).
4. Deploy.

The Socket.io server is deployed on Render, not Vercel, because serverless functions do not support persistent WebSocket connections.

## Manual Testing

1. Open the app in two separate browser windows (or on two devices).
2. Join with different usernames. The server should log one connection per window.
3. Send messages from both and confirm they appear once, as `[Username]: message`, in both windows.
4. Type in one window and confirm the typing indicator appears only in the other.
5. Put the users in different rooms and confirm messages do not cross between them.
6. Optionally connect with Postman (**New → WebSocket**) to `ws://localhost:5000/socket.io/?EIO=4&transport=websocket`. Send `40`, then `42["join room",{"room":"General"}]`, then a chat message packet that includes a `room`.

> In development, React StrictMode mounts components twice, so the first page load logs `connected → disconnected → connected`. Only one connection stays open. A production build logs a single connection.

## Known Limitations

- Messages are not stored. The list clears when switching rooms and on page refresh.
- Usernames are not checked for uniqueness across clients.
- The server runs as a single instance. Running several would require a Socket.io adapter such as Redis.

## License

For educational use.
