const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // public 配下はそのまま配信

// ゲーム設定
const canvasWidth = 400;
const canvasHeight = 664;
const charSize = 50;
const friction = 0.95;
const minVelocity = 0.5;
const swipeCooldown = 5000; // 5秒ウェイト
const assetList = ["char1.png","char2.png","char3.png","char4.png"];

let players = {};

// ゲームループ 60fps
setInterval(() => {
  for (let id in players) {
    const p = players[id];

    // 速度が小さければ0に
    if (Math.abs(p.vx) < minVelocity) p.vx = 0;
    if (Math.abs(p.vy) < minVelocity) p.vy = 0;

    // 位置更新
    p.x += p.vx;
    p.y += p.vy;

    // 壁反射＆向き反転
    if (p.x <= 0) { p.x = 0; p.vx = Math.abs(p.vx); p.facing = "right"; }
    if (p.x + charSize >= canvasWidth) { p.x = canvasWidth - charSize; p.vx = -Math.abs(p.vx); p.facing = "left"; }
    if (p.y <= 0) { p.y = 0; p.vy = Math.abs(p.vy); }
    if (p.y + charSize >= canvasHeight) { p.y = canvasHeight - charSize; p.vy = -Math.abs(p.vy); }

    // 慣性減速
    p.vx *= friction;
    p.vy *= friction;
  }

  // 全プレイヤーに状態送信
  io.emit("state", players);
}, 1000/60);

io.on("connection", socket => {
  console.log("接続:", socket.id);

  // 初期位置とキャラランダム設定
  const x = Math.floor(Math.random() * (canvasWidth - charSize));
  const y = Math.floor(Math.random() * (canvasHeight - charSize));
  const asset = assetList[Math.floor(Math.random() * assetList.length)];
  players[socket.id] = { x, y, vx:0, vy:0, hp:100, asset, facing:"right", lastSwipe:0 };

  // 接続直後の状態送信
  socket.emit("state", players);

  // スワイプ入力処理
  socket.on("swipe", data => {
    const p = players[socket.id];
    if (!p) return;

    const now = Date.now();
    if (now - p.lastSwipe < swipeCooldown) return; // ウェイト中
    p.lastSwipe = now;

    const scale = 0.3; // スワイプ量→速度
    p.vx = data.dx * scale;
    p.vy = data.dy * scale;

    // 向き反転
    if (p.vx < 0) p.facing = "left";
    else if (p.vx > 0) p.facing = "right";
  });

  // 切断処理
  socket.on("disconnect", () => {
    console.log("切断:", socket.id);
    delete players[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("サーバー起動:", PORT));
