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
    hp: 50,
    asset: enemyAssetList[Math.floor(Math.random() * enemyAssetList.length)],
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 4,
    dir: 1
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

  // ランダムな初期位置（キャラクター選択前はnull）
  const randomX = Math.floor(Math.random() * (canvasWidth - playerSize));
  const randomY = Math.floor(Math.random() * (canvasHeight - playerSize));

  players[socket.id] = {
    x: randomX,
    y: randomY,
    hp: 100,
    asset: null, // 選択前
    vx: 0,
    vy: 0,
    dir: 1
  };

  socket.emit("myId", socket.id);
  io.emit("state", { players, enemies });

  // --- キャラクター選択 ---
  socket.on("chooseCharacter", assetName => {
    if (assetList.includes(assetName) && players[socket.id]) {
      players[socket.id].asset = assetName;
      console.log(`${socket.id} が ${assetName} を選択`);
      io.emit("state", { players, enemies });
    }
  });

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
    const attackRange = 150;

    for (let eid in enemies) {
      const e = enemies[eid];
      const dxEnemy = e.x + playerSize/2 - (p.x + playerSize/2);
      const dyEnemy = e.y + playerSize/2 - (p.y + playerSize/2);
      const dist = Math.sqrt(dxEnemy*dxEnemy + dyEnemy*dyEnemy);
      if (dist <= attackRange) {
        e.hp -= Math.max(power, 1);
        if (e.hp <= 0) respawnEnemy(eid);
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
  for (let id in players) {
    const p = players[id];
    p.x += p.vx;
    p.y += p.vy;

    if (p.x <= 0) { p.x = 0; p.vx = Math.abs(p.vx); p.dir = 1; }
    if (p.x + playerSize >= canvasWidth) { p.x = canvasWidth - playerSize; p.vx = -Math.abs(p.vx); p.dir = -1; }
    if (p.y <= 0) { p.y = 0; p.vy = Math.abs(p.vy); }
    if (p.y + playerSize >= canvasHeight) { p.y = canvasHeight - playerSize; p.vy = -Math.abs(p.vy); }

    p.vx *= friction;
    p.vy *= friction;
    if (Math.abs(p.vx) < minVelocity) p.vx = 0;
    if (Math.abs(p.vy) < minVelocity) p.vy = 0;
  }

  for (let id in enemies) {
    const e = enemies[id];
    e.x += e.vx;
    e.y += e.vy;

    if (e.x <= 0) { e.x = 0; e.vx = Math.abs(e.vx); e.dir = 1; }
    if (e.x + playerSize >= canvasWidth) { e.x = canvasWidth - playerSize; e.vx = -Math.abs(e.vx); e.dir = -1; }
    if (e.y <= 0) { e.y = 0; e.vy = Math.abs(e.vy); }
    if (e.y + playerSize >= canvasHeight) { e.y = canvasHeight - playerSize; e.vy = -Math.abs(e.vy); }
  }

  // --- ここから敵との衝突判定 ---
  for (let eid in enemies) {
    const e = enemies[eid];
  
    for (let pid in players) {
      const p = players[pid];
  
      const pxCenter = p.x + playerSize/2;
      const pyCenter = p.y + playerSize/2;
      const exCenter = e.x + playerSize/2;
      const eyCenter = e.y + playerSize/2;
  
      const dx = pxCenter - exCenter;
      const dy = pyCenter - eyCenter;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const collisionRadius = playerSize * 0.75 + playerSize * 0.75;
  
      if (dist < collisionRadius) {
        p.hp -= 5; // HP減少量
        if (p.hp <= 0) {
          io.to(pid).emit("youDied");
          delete players[pid];
        }
      }
    }
  }
  io.emit("state", { players, enemies });
}, 1000/60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("サーバー起動:", PORT));



