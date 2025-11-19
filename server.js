import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

// 🔑 Change this to something only you know, or set as an env var in Railway
const CLEAR_KEY = process.env.CHAT_CLEAR_KEY || "CHANGE_THIS_KEY";

// Allow your site + dev
app.use(
  cors({
    origin: [
      "https://www.crossway-fellowship.org",
      "http://localhost:8069",
      "http://localhost:8069/"
    ],
    methods: ["GET", "POST"]
  })
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// In-memory chat history
const chatMessages = [];

// 🧹 Helper: clear messages and notify clients
function clearChatHistory(reason = "manual/unknown") {
  chatMessages.length = 0;
  console.log(`Chat history cleared (${reason}) at`, new Date().toISOString());
  io.emit("chatCleared"); // all connected clients can wipe their UI
}

// ⏰ Schedule automatic weekly reset: Sunday 12:15 PM (server local time)
function scheduleWeeklyReset() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  let addDays = (7 - day) % 7; // days until Sunday

  // Next Sunday if already past today's reset time
  const next = new Date(now);
  next.setHours(12, 15, 0, 0); // 12:15 PM

  if (addDays === 0 && now >= next) {
    // It's Sunday but already past 12:15 → schedule for next week
    addDays = 7;
  }

  if (addDays > 0) {
    next.setDate(now.getDate() + addDays);
  }

  const delay = next.getTime() - now.getTime();

  console.log(
    "Next weekly chat reset scheduled at",
    next.toISOString(),
    "(in",
    Math.round(delay / 1000),
    "seconds)"
  );

  setTimeout(() => {
    clearChatHistory("weekly");
    // Schedule the next reset again
    scheduleWeeklyReset();
  }, delay);
}

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

// 🌐 Health check route (optional)
app.get("/", (req, res) => {
  res.send("Crossway chat server is running.");
});

// 🌐 Manual clear endpoint (you call this yourself)
app.all("/admin/clear-chat", (req, res) => {
  const key = req.query.key;
  if (key !== CLEAR_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }
  clearChatHistory("manual");
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Chat server listening on port " + PORT);
  // Start the weekly reset timer
  scheduleWeeklyReset();
});
