const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};
const assetList = ["char1.png","char2.png","char3.png","char4.png"];

io.on("connection",(socket)=>{
  console.log("接続:",socket.id);

  // ランダムでアセット割り当て
  const randomAsset = assetList[Math.floor(Math.random()*assetList.length)];
  players[socket.id] = { x:100, y:100, hp:100, asset:randomAsset };

  // 新規プレイヤーを全員に通知
  socket.emit("state", players);
  socket.broadcast.emit("newPlayer", { id:socket.id, ...players[socket.id] });

  // 移動イベント（スワイプ方向）
  socket.on("move",(data)=>{
    if(players[socket.id]){
      players[socket.id].x += data.x;
      players[socket.id].y += data.y;

      // 画面外に出ないよう制限
      if(players[socket.id].x<0) players[socket.id].x=0;
      if(players[socket.id].y<0) players[socket.id].y=0;

      io.emit("state", players);
    }
  });

  socket.on("disconnect",()=>{
    console.log("切断:",socket.id);
    delete players[socket.id];
    io.emit("state", players);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT,()=>console.log("サーバー起動:",PORT));
