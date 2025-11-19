import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

// Allow your site + dev
app.use(cors({
  origin: [
    "https://www.crossway-fellowship.org",
    "http://localhost:8069",
    "http://localhost:8069/"
  ],
  methods: ["GET", "POST"]
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// In-memory chat history
const chatMessages = [];

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Send existing messages to the newly connected client
  chatMessages.forEach((m) => socket.emit("chatMessage", m));

  // When a chat message comes in
  socket.on("chatMessage", (payload) => {
    const name = (payload?.name || "").trim() || "Anonymous";
    const text = (payload?.text || "").trim();

    if (!text) return;

    const msg = {
      name,
      text,
      ts: Date.now()
    };

    // Save in history (cap to 500 messages so it doesn't grow forever)
    chatMessages.push(msg);
    if (chatMessages.length > 500) chatMessages.shift();

    // Broadcast to everyone
    io.emit("chatMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Health check route (optional)
app.get("/", (req, res) => {
  res.send("Crossway chat server is running.");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Chat server listening on port " + PORT);
});
