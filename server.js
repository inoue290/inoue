const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};
const assetList = ["char1.png", "char2.png", "char3.png", "char4.png"];

// 衝突判定用の距離
const HIT_RADIUS = 50;

io.on("connection", (socket) => {
  console.log("接続:", socket.id);

  // ランダムでアセット割り当て
  const randomAsset = assetList[Math.floor(Math.random() * assetList.length)];
  players[socket.id] = { x: 100, y: 100, hp: 100, asset: randomAsset };

  // 現在のプレイヤー情報を送信
  socket.emit("state", players);

  // 新規プレイヤーを他に通知
  socket.broadcast.emit("state", players);

  // スワイプ移動
  socket.on("move", (data) => {
    if (!players[socket.id]) return;

    players[socket.id].x += data.x;
    players[socket.id].y += data.y;

    // 画面端制限（仮に 600x400 で調整）
    players[socket.id].x = Math.max(0, Math.min(players[socket.id].x, 600));
    players[socket.id].y = Math.max(0, Math.min(players[socket.id].y, 400));

    // 衝突判定とダメージ
    for (let id in players) {
      if (id === socket.id) continue;
      const p = players[id];
      const dx = players[socket.id].x - p.x;
      const dy = players[socket.id].y - p.y;
      const distance = Math.sqrt(dx*dx + dy*dy);

      if (distance < HIT_RADIUS) {
        p.hp -= 10;
        if (p.hp <= 0) {
          // 相手プレイヤーHP0になったら通知
          io.to(id).emit("youDied");
          delete players[id];
        }
      }
    }

    // 全員に状態送信
    io.emit("state", players);
  });

  socket.on("disconnect", () => {
    console.log("切断:", socket.id);
    delete players[socket.id];
    io.emit("state", players);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("サーバー起動:", PORT));
