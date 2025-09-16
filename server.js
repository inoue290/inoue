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

  const randomAsset = assetList[Math.floor(Math.random()*assetList.length)];
  players[socket.id] = { x: 100, y: 100, hp: 100, asset: randomAsset };

  // 全プレイヤー送信
  socket.emit("state", players);
  socket.broadcast.emit("newPlayer", { id: socket.id, ...players[socket.id] });

  // スワイプ移動
  socket.on("move", (data) => {
    if(players[socket.id]){
      players[socket.id].x += data.x;
      players[socket.id].y += data.y;

      // HP減少テスト（任意：触れ合ったらダメージ）
      for(let id in players){
        if(id!==socket.id){
          const dx = players[socket.id].x - players[id].x;
          const dy = players[socket.id].y - players[id].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if(dist<64){ // 当たり判定
            players[id].hp -= 10;
            if(players[id].hp<=0){
              io.to(id).emit("youDied");
              delete players[id];
            }
          }
        }
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
server.listen(PORT, () => console.log("サーバー起動:", PORT));
