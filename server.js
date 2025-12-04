<!DOCTYPE html>
<html>
<head>
  <title>Crossway Live Chat</title>
  <style>
    body { font-family: Arial; background:#f2f7fa; margin:0; padding:0; }
    #chatbox {
      height: 400px; overflow-y:auto; background:white;
      border:1px solid #ccc; margin:20px; padding:10px; border-radius:6px;
    }
    #msgInput { width:70%; padding:10px; font-size:16px; }
    #sendBtn { padding:10px 20px; font-size:16px; }

    #adminPanel {
      display:none; background:#eef6ff; padding:20px; margin:20px;
      border-radius:6px; border:1px solid #b7d6ff;
    }
    .adminBtn {
      padding:10px 18px; font-size:16px; margin:6px;
      cursor:pointer; background:#3f76ff; color:white; border:none; border-radius:4px;
    }
    .resetBtn { background:#d9534f; }

    .hostMsg { color:#d9534f; font-weight:bold; }
  </style>
</head>
<body>

  <h2 style="text-align:center; margin-top:18px;">📡 Crossway Live Chat</h2>

  <!-- CHAT WINDOW -->
  <div id="chatbox"></div>

  <!-- Public input -->
  <div style="text-align:center;">
    <input id="msgInput" placeholder="Write a message..." />
    <button id="sendBtn">Send</button>
  </div>

  <br><br><center>
    <button onclick="toggleAdmin()">🔧 Admin Controls</button>
  </center>

  <!-- ADMIN -->
  <div id="adminPanel">
    <h3>Admin Panel</h3>
    <button class="adminBtn resetBtn" onclick="resetChat()">🧹 Reset Chat</button><br><br>
    <input id="adminMsg" placeholder="Host message..." style="width:70%; padding:10px;" />
    <button class="adminBtn" onclick="sendHost()">Send as Host</button>
  </div>

<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
<script>
const socket = io();
const chatbox = document.getElementById("chatbox");

socket.on("chat-history", msgs => msgs.forEach(addMsg));
socket.on("chat-message", addMsg);
socket.on("chat-cleared", ()=> chatbox.innerHTML="");

function addMsg(msg){
  const div = document.createElement("div");
  div.style.marginBottom="10px";
  if(msg.author==="Host"){
    div.innerHTML=`<span class="hostMsg">Host:</span> ${msg.text}`;
  } else {
    div.innerHTML=`<b>${msg.author||"User"}:</b> ${msg.text}`;
  }
  chatbox.appendChild(div);
  chatbox.scrollTop = chatbox.scrollHeight;
}

document.getElementById("sendBtn").onclick = () => {
  const txt = msgInput.value.trim();
  if(!txt) return;
  socket.emit("chat-message",{author:"User", text:txt});
  msgInput.value="";
};

function toggleAdmin(){
  adminPanel.style.display = adminPanel.style.display==="none"?"block":"none";
}
function resetChat(){
  fetch("/admin/reset",{method:"POST"})
  .then(()=>alert("Chat Reset"));
}
function sendHost(){
  const txt = adminMsg.value.trim();
  if(!txt) return alert("Enter a message");
  fetch("/admin/send",{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({text:txt})
  }).then(()=>{ alert("Sent as Host"); adminMsg.value=""; });
}
</script>
</body>
</html>
