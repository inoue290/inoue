const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

// public フォルダを静的配信
app.use(express.static("public"));

// Render 用に http.Server を作成
const server = http.createServer(app);

// CORS 設定を追加して WebSocket 接続を許可
const io = new Server(server, {
  cors: {
    origin: "*", // Render の URL でも OK
    methods: ["GET", "POST"]
  }
});

let players = {};
const assetList = ["char1.png", "char2.png", "char3.png", "char4.png"];

io.on("connection", (socket) => {
  console.log("接続:", socket.id);

  // ランダムでアセット割り当て
  const randomAsset = assetList[Math.floor(Math.random() * assetList.length)];
  players[socket.id] = { x:100, y:100, hp:100, asset: randomIndex };

  // 全プレイヤー送信
  socket.emit("state", players);
  socket.broadcast.emit("newPlayer", { id: socket.id, ...players[socket.id] });

  // 移動イベント
  socket.on("move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x += data.x;
      players[socket.id].y += data.y;
      io.emit("state", players); // 常に state を送信
    }
  });

  // ダメージイベント
  socket.on("hit", (targetId) => {
    if (players[targetId]) {
      players[targetId].hp -= 10;
      if (players[targetId].hp <= 0) {
        delete players[targetId];
        io.emit("state", players);
      } else {
        io.emit("state", players);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("切断:", socket.id);
    delete players[socket.id];
    io.emit("state", players);
  });
});

// Render の環境変数 PORT を使う
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("サーバー起動:", PORT));

