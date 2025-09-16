// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// CORS 設定で全オリジン許可
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// public フォルダを静的配信
app.use(express.static(path.join(__dirname, "public")));

let players = {};
const assetList = ["char1.png", "char2.png", "char3.png", "char4.png"];

io.on("connection", (socket) => {
  console.log("接続:", socket.id);

  // ランダムでアセット割り当て
  const randomAsset = assetList[Math.floor(Math.random() * assetList.length)];
  players[socket.id] = { x: 100, y: 100, hp: 100, asset: randomAsset };

  // 接続したクライアントに現在のプレイヤー情報を送信
  socket.emit("state", players);

  // 新規プレイヤーを他の全員に通知
  socket.broadcast.emit("newPlayer", { id: socket.id, ...players[socket.id] });

  // 移動イベント
  socket.on("move", (direction) => {
    if (!players[socket.id]) return;

    const speed = 10;
    switch (direction) {
      case "up": players[socket.id].y -= speed; break;
      case "down": players[socket.id].y += speed; break;
      case "left": players[socket.id].x -= speed; break;
      case "right": players[socket.id].x += speed; break;
    }

    io.emit("playerMoved", { id: socket.id, ...players[socket.id] });
  });

  // クリックやタップで移動（任意）
  socket.on("moveTo", (pos) => {
    if (!players[socket.id]) return;
    players[socket.id].x = pos.x;
    players[socket.id].y = pos.y;
    io.emit("playerMoved", { id: socket.id, ...players[socket.id] });
  });

  // ダメージイベント
  socket.on("hit", (targetId) => {
    if (!players[targetId]) return;

    players[targetId].hp -= 10;
    if (players[targetId].hp <= 0) {
      delete players[targetId];
      io.emit("playerDead", targetId);
    } else {
      io.emit("playerHit", { id: targetId, hp: players[targetId].hp });
    }
  });

  // 切断
  socket.on("disconnect", () => {
    console.log("切断:", socket.id);
    delete players[socket.id];
    io.emit("playerLeft", socket.id);
  });
});

// Render 用に process.env.PORT を使用
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("サーバー起動:", PORT));

