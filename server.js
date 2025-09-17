const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public 配下を静的ファイルとして配信
app.use(express.static("public"));

// プレイヤー情報
let players = {};
const assetList = ["char1.png", "char2.png", "char3.png", "char4.png"];

// 接続時
io.on("connection", (socket) => {
  console.log("接続:", socket.id);

// ゲーム画面の幅と高さを338x600に設定
const gameWidth = 338;
const gameHeight = 600;
// ランダムな位置を生成
const randomX = Math.floor(Math.random() * gameWidth);
const randomY = Math.floor(Math.random() * gameHeight);
// ランダムなキャラを選択
const randomAsset = assetList[Math.floor(Math.random() * assetList.length)];
// プレイヤー情報にランダムな位置とキャラを設定
players[socket.id] = { x: randomX, y: randomY, hp: 100, asset: randomAsset };


  // 現在のプレイヤー状態送信
  socket.emit("state", players);
  socket.broadcast.emit("state", players);

  // 移動イベント（スワイプ）
  socket.on("move", (data) => {
    const p = players[socket.id];
    if (!p) return;

    p.x += data.x;
    p.y += data.y;

    // 画面端で止める
    if (p.x < 0) p.x = 0;
    if (p.y < 0) p.y = 0;

    // 画面サイズは固定ならここで制限可能
    // 例: canvasWidth = 330, canvasHeight = 600
    const canvasWidth = 330;
    const canvasHeight = 600;
    if (p.x > canvasWidth - 100) p.x = canvasWidth - 100;
    if (p.y > canvasHeight - 100) p.y = canvasHeight - 100;

    // 当たり判定: 他プレイヤーとの距離が近ければダメージ
    for (let id in players) {
      if (id === socket.id) continue;
      const other = players[id];
      const dx = p.x - other.x;
      const dy = p.y - other.y;
      const distance = Math.sqrt(dx*dx + dy*dy);
      if (distance < 50) { // 当たり判定半径
        other.hp -= 10;
        if (other.hp <= 0) {
          // 死亡したプレイヤーに通知
          io.to(id).emit("youDied");
          delete players[id];
        }
      }
    }

    // 全員に状態を送信
    io.emit("state", players);
  });

  socket.on("disconnect", () => {
    console.log("切断:", socket.id);
    delete players[socket.id];
    io.emit("state", players);
  });
});

// ポート設定（Render では process.env.PORT）
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("サーバー起動:", PORT));


