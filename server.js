const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};
const assetList = ["char1.png","char2.png","char3.png","char4.png"];

io.on("connection", (socket) => {
  console.log("接続:", socket.id);

  // ランダムでアセット割り当て（文字列）
  const randomAsset = assetList[Math.floor(Math.random() * assetList.length)];
  players[socket.id] = { x:100, y:100, hp:100, asset: randomAsset };

  // 全プレイヤーを送信
  io.emit("state", players);

  // 移動
  socket.on("move", (data) => {
    if(players[socket.id]){
      players[socket.id].x += data.x;
      players[socket.id].y += data.y;
      io.emit("state", players);
    }
  });

  // ダメージ
  socket.on("hit", (targetId) => {
    if(players[targetId]){
      players[targetId].hp -= 10;
      if(players[targetId].hp <=0){
        delete players[targetId];
      }
      io.emit("state", players);
    }
  });

  socket.on("disconnect", () => {
    console.log("切断:", socket.id);
    delete players[socket.id];
    io.emit("state", players);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log("サーバー起動:",PORT));
