const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const fs = require("fs");
const path = require("path");

// Middleware
app.use(express.json());
app.use(express.static("public"));

// JSON message storage
const dataFile = path.join(__dirname, "data/messages.json");

function loadData(){
  try { return JSON.parse(fs.readFileSync(dataFile)); }
  catch { return { messages:[], lastReset:"" }; }
}
function saveData(data){
  fs.writeFileSync(dataFile, JSON.stringify(data,null,2));
}

// Reset chat storage + notify all clients
function resetChat(){
  const data = loadData();
  data.messages = [];
  data.lastReset = new Date().toISOString();
  saveData(data);
  io.emit("chat-cleared");
  console.log("CHAT RESET – Manual or Scheduled");
}

// SOCKET CONNECTIONS
io.on("connection",(socket)=>{
  console.log("Client connected");

  // Send full chat history to new connection
  const data = loadData();
  socket.emit("chat-history", data.messages);

  // RECEIVE normal message (not used anymore but kept for safety)
  socket.on("chat-message",(msg)=>{
    const data = loadData();
    data.messages.push(msg);
    saveData(data);
    io.emit("chat-message", msg); // broadcast to all
  });

  // 🔥 RECEIVE HOST message socket-only
  socket.on("host-message",(msg)=>{
    const message = {
      author:"Host",
      text:msg.text,
      timestamp: Date.now()
    };
    const data = loadData();
    data.messages.push(message);
    saveData(data);

    io.emit("chat-message", message); // broadcast instantly
    console.log("HOST SENT:", message.text);
  });

  // RESET via socket
  socket.on("reset-chat",()=>{
    resetChat();
  });
});

// HTTP endpoints fallback (still usable)
app.post("/admin/send",(req,res)=>{
  io.emit("chat-message",{author:"Host", text:req.body.text, timestamp:Date.now()});
  res.send("Host message sent via HTTP");
});
app.post("/admin/reset",(req,res)=>{ resetChat(); res.send("Chat reset"); });

// Auto weekly reset
setInterval(()=>{
  const now = new Date();
  const est = new Date(now.toLocaleString("en-US",{timeZone:"America/New_York"}));
  const data = loadData();
  const last = data.lastReset ? new Date(data.lastReset).getDate() : null;

  if(est.getDay()===0 && est.getHours()===12 && est.getMinutes()===30 && last!==est.getDate()){
    resetChat();
  }
},60000);

// Start server
http.listen(process.env.PORT||3000,()=>console.log("Chat server running"));
