const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const fs = require("fs");
const path = require("path");

app.use(express.json());
app.use(express.static("public"));

const dataFile = path.join(__dirname, "data/messages.json");

function loadData() {
  try { return JSON.parse(fs.readFileSync(dataFile)); }
  catch { return { messages: [], lastReset: "" }; }
}
function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function resetChat() {
  const data = loadData();
  data.messages = [];
  data.lastReset = new Date().toISOString();
  saveData(data);
  io.emit("chat-cleared");
  console.log("CHAT RESET — Manual or Scheduled");
}

io.on("connection", (socket) => {
  const data = loadData();
  socket.emit("chat-history", data.messages);

  socket.on("chat-message", (msg) => {
    const data = loadData();
    data.messages.push(msg);
    saveData(data);
    io.emit("chat-message", msg);
  });
});

app.post("/admin/reset", (req, res) => {
  resetChat();
  res.send("Chat Reset");
});

app.post("/admin/send", (req, res) => {
  const message = {
    author: "Host",
    text: req.body.text,
    timestamp: Date.now()
  };
  const data = loadData();
  data.messages.push(message);
  saveData(data);
  io.emit("chat-message", message);
  res.send("Host Message Sent");
});

setInterval(() => {
  const now = new Date();
  const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const isSunday = est.getDay() === 0;
  const is1230 = est.getHours() === 12 && est.getMinutes() === 30;
  let data = loadData();
  let last = data.lastReset ? new Date(data.lastReset).getDate() : null;

  if (isSunday && is1230 && last !== est.getDate()) {
    resetChat();
  }
}, 60000);

http.listen(process.env.PORT || 3000, () =>
  console.log("Chat server running")
);
