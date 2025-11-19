import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

// Allow only your website(s)
const allowedOrigins = [
  "https://www.crossway-fellowship.org",
  "http://localhost:8000" // local testing
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Host emails loaded from Railway env var
const HOST_EMAILS = (process.env.HOST_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Store users
const users = new Map();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join", (userInfo) => {
    const { userId, name, email } = userInfo || {};

    if (!userId || !name || !email) {
      console.log("Invalid join:", userInfo);
      return;
    }

    const normalizedEmail = email.toLowerCase();
    const isHost = HOST_EMAILS.includes(normalizedEmail);

    const user = {
      userId: String(userId),
      name: String(name),
      email: normalizedEmail,
      isHost
    };

    users.set(socket.id, user);

    console.log("User joined:", user);

    socket.broadcast.emit("userJoined", {
      userId: user.userId,
      name: user.name
    });
  });

  socket.on("chatMessage", (payload) => {
    const user = users.get(socket.id);
    if (!user) return;

    const { text, to } = payload || {};
    const cleanText = String(text || "").trim();
    if (!cleanText) return;

    const message = {
      from: {
        userId: user.userId,
        name: user.name,
        email: user.email
      },
      text: cleanText,
      to: to === "host" ? "host" : "everyone",
      private: to === "host",
      timestamp: new Date().toISOString()
    };

    if (message.to === "everyone") {
      io.emit("chatMessage", message);
    } else {
      for (const [sid, u] of users.entries()) {
        if (u.isHost) io.to(sid).emit("chatMessage", message);
      }
      socket.emit("chatMessage", message); // echo to sender
    }
  });

  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) {
      console.log("User disconnected:", user);
      users.delete(socket.id);

      io.emit("userLeft", {
        userId: user.userId,
        name: user.name
      });
    }
  });
});

// Health check
app.get("/", (req, res) => {
  res.send("Chat server running.");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`Chat server listening on port ${PORT}`)
);
