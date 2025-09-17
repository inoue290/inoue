const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};
const assetList = ["char1.png","char2.png","char3.png","char4.png"];

const canvasWidth = 352;
const canvasHeight = 606;
const playerSize = 100;
const friction = 0.95;
const minVelocity = 0.5;

io.on("connection", socket => {
  console.log("接続:", socket.id);

  // ランダムな初期位置とキャラクター
  const randomX = Math.floor(Math.random() * (canvasWidth - playerSize));
  const randomY = Math.floor(Math.random() * (canvasHeight - playerSize));
  const randomAsset = assetList[Math.floor(Math.random() * assetList.length)];

  players[socket.id] = {
    x: randomX,
    y: randomY,
    hp: 100,
    asset: randomAsset,
    vx: 0,
    vy: 0,
    dir: 1
  };

  // 自分のIDを通知
  socket.emit("myId", socket.id);

  socket.emit("state", players);
  socket.broadcast.emit("state", players);

  // クライアントからのスワイプ入力
  socket.on("move", data => {
    const p = players[socket.id];
    if (!p) return;

    // 入力を速度に加算
    p.vx += data.x;
    p.vy += data.y;

    // 向きはX速度に従う
    if (p.vx !== 0) p.dir = p.vx >= 0 ? 1 : -1;
  });

  socket.on("disconnect", () => {
    console.log("切断:", socket.id);
    delete players[socket.id];
    io.emit("state", players);
  });
});

// サーバーゲームループ（座標・壁・衝突・HP管理）
setInterval(() => {
  for (let id in players) {
    const p = players[id];

    // 座標更新
    p.x += p.vx;
    p.y += p.vy;

    // 壁反射
    if (p.x <= 0) { p.x = 0; p.vx = Math.abs(p.vx); p.dir = 1; }
    if (p.x + playerSize >= canvasWidth) { p.x = canvasWidth - playerSize; p.vx = -Math.abs(p.vx); p.dir = -1; }
    if (p.y <= 0) { p.y = 0; p.vy = Math.abs(p.vy); }
    if (p.y + playerSize >= canvasHeight) { p.y = canvasHeight - playerSize; p.vy = -Math.abs(p.vy); }

    // 慣性減速
    p.vx *= friction;
    p.vy *= friction;
    if (Math.abs(p.vx) < minVelocity) p.vx = 0;
    if (Math.abs(p.vy) < minVelocity) p.vy = 0;

    // 他プレイヤーとの当たり判定
    for (let otherId in players) {
      if (otherId === id) continue;
      const o = players[otherId];
      const dx = p.x - o.x;
      const dy = p.y - o.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < playerSize) {
        o.hp -= 10;
        if (o.hp <= 0) {
          io.to(otherId).emit("youDied");
          delete players[otherId];
        }
      }
    }
  }

  io.emit("state", players);
}, 1000/60); // 60FPS

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("サーバー起動:", PORT));




