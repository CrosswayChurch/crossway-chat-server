import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors({
  origin: [
    "https://www.crossway-fellowship.org", // your real domain
    "http://localhost:8069"                // dev / Odoo if you use it
  ],
  methods: ["GET", "POST"]
}));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*"} });

const users = new Map();
const chatMessages = [];

const HOST_EMAILS = new Set([
  "jeff@builtbydesignworks.com",
  "crosswaymennonite@gmail.com"
]);

io.on("connection", (socket) => {
  let user = null;

  socket.on("join", (data) => {
    if (!data || !data.email) return;

    user = {
      id: data.userId || socket.id,
      name: data.name || "Guest",
      email: data.email,
      isHost: HOST_EMAILS.has(data.email.toLowerCase())
    };

    users.set(socket.id, user);
    console.log("User joined:", user.email);

    // send existing messages if you want history
    chatMessages.forEach((m) => socket.emit("chatMessage", m));
  });

  socket.on("chatMessage", (payload) => {
    if (!user) return;
    const text = (payload?.text || "").trim();
    if (!text) return;

    const msg = {
      from: { name: user.name, email: user.email, isHost: user.isHost },
      text,
      ts: Date.now()
    };

    chatMessages.push(msg);
    io.emit("chatMessage", msg); // broadcast to everyone
  });

  socket.on("disconnect", () => {
    users.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Chat server listening on " + PORT);
});
