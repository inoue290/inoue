const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};
const assetList = ["char1.png","char2.png","char3.png","char4.png"];

let enemies = {};
const enemyCount = 1;
const enemyAssetList = ["enemy1.png", "enemy2.png"];
const attackCooldown = 1000; // 1秒に1回

const canvasWidth = 352;
const canvasHeight = 606;
const playerSize = 75;
const friction = 0.95;
const minVelocity = 0.5;

// --- 敵生成・再生成関数 ---
function createEnemy() {
  return {
    x: Math.random() * (canvasWidth - playerSize),
    y: Math.random() * (canvasHeight - playerSize),
    hp: 50, // HP増加
    asset: enemyAssetList[Math.floor(Math.random() * enemyAssetList.length)],
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 4,
    dir: 1,
    lastAttack: 0
  };
}

function spawnEnemies() {
  for (let i = 0; i < enemyCount; i++) {
    const id = "enemy_" + i;
    enemies[id] = createEnemy();
  }
}

function respawnEnemy(id) {
  enemies[id] = createEnemy();
}

spawnEnemies(); // サーバー起動時に敵を出す

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
  socket.emit("state", { players, enemies });
  socket.broadcast.emit("state", { players, enemies });

  // --- 移動 ---
  socket.on("move", data => {
    const p = players[socket.id];
    if (!p) return;
    p.vx += data.x;
    p.vy += data.y;
    if (p.vx !== 0) p.dir = p.vx >= 0 ? 1 : -1;
  });

  // --- 攻撃 ---
  socket.on("attack", ({ dx, dy, power }) => {
    const p = players[socket.id];
    if (!p) return;

    const attackRange = 150; // 攻撃範囲を広く
    const attackAngle = Math.atan2(dy, dx);

    for (let eid in enemies) {
      const e = enemies[eid];
      const dxEnemy = e.x - p.x;
      const dyEnemy = e.y - p.y;
      const dist = Math.sqrt(dxEnemy*dxEnemy + dyEnemy*dyEnemy);
      const enemyAngle = Math.atan2(dyEnemy, dxEnemy);

      let angleDiff = Math.abs(enemyAngle - attackAngle);
      if (angleDiff > Math.PI) angleDiff = 2*Math.PI - angleDiff;

      const hitRadius = playerSize / 2 + 10; // 判定半径
      if (dist <= hitRadius && angleDiff < Math.PI / 4) {
        e.hp -= power;
        if (e.hp <= 0) {
          respawnEnemy(eid); // 倒れたら自動再生成
        }
      }
    }
  });

  // --- 切断 ---
  socket.on("disconnect", () => {
    console.log("切断:", socket.id);
    delete players[socket.id];
    io.emit("state", { players, enemies });
  });
});

// --- ゲームループ ---
setInterval(() => {
  // プレイヤー処理
  for (let id in players) {
    const p = players[id];
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

    // 他プレイヤーとの衝突
    for (let otherId in players) {
      if (otherId === id) continue;
      const o = players[otherId];
      const dx = p.x - o.x;
      const dy = p.y - o.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const collisionRadius = playerSize * 1.2;
      if (dist < collisionRadius) {
        o.hp -= 10;
        if (o.hp <= 0) {
          io.to(otherId).emit("youDied");
          delete players[otherId];
        }
      }
    }
  }

  // 敵処理
  for (let id in enemies) {
    const e = enemies[id];
    e.x += e.vx;
    e.y += e.vy;

    // 壁反射
    if (e.x <= 0) { e.x = 0; e.vx = Math.abs(e.vx); e.dir = 1; }
    if (e.x + playerSize >= canvasWidth) { e.x = canvasWidth - playerSize; e.vx = -Math.abs(e.vx); e.dir = -1; }
    if (e.y <= 0) { e.y = 0; e.vy = Math.abs(e.vy); }
    if (e.y + playerSize >= canvasHeight) { e.y = canvasHeight - playerSize; e.vy = -Math.abs(e.vy); }

    // プレイヤーとの衝突
    for (let pid in players) {
      const p = players[pid];
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const collisionRadius = playerSize * 1.2;
      if (dist < collisionRadius) {
        p.hp -= 1;
        if (p.hp <= 0) {
          io.to(pid).emit("youDied");
          delete players[pid];
        }
      }
    }
  }

  io.emit("state", { players, enemies });
}, 1000/60); // 60FPS

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("サーバー起動:", PORT));
