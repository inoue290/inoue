const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let players = {};
let images = {};
let fieldImg = new Image();
fieldImg.src = "/assets/field.png"; // 縦長アリーナ画像

// キャラ画像（4種類）
const assetList = [
  "/assets/chara1.png",
  "/assets/chara2.png",
  "/assets/chara3.png",
  "/assets/chara4.png"
];

// 読み込み
assetList.forEach((src, i) => {
  const img = new Image();
  img.src = src;
  images[i] = img;
});

// プレイヤー情報を受け取る
socket.on("state", (serverPlayers) => {
  players = serverPlayers;
  draw();
});

function draw() {
  // 背景を描画
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (fieldImg.complete) {
    ctx.drawImage(fieldImg, 0, 0, canvas.width, canvas.height);
  }

  // 各プレイヤーを描画
  for (let id in players) {
    const p = players[id];
    const img = images[p.asset];
    if (img) {
      ctx.drawImage(img, p.x, p.y, 64, 64);
    }

    // HPバー
    ctx.fillStyle = "red";
    ctx.fillRect(p.x, p.y - 10, 64, 5);
    ctx.fillStyle = "green";
    ctx.fillRect(p.x, p.y - 10, (p.hp / 100) * 64, 5);
  }
}

// スマホのスワイプ操作
let startX, startY;
canvas.addEventListener("touchstart", (e) => {
  const touch = e.touches[0];
  startX = touch.clientX;
  startY = touch.clientY;
});
canvas.addEventListener("touchend", (e) => {
  const touch = e.changedTouches[0];
  const dx = touch.clientX - startX;
  const dy = touch.clientY - startY;
  if (Math.abs(dx) > Math.abs(dy)) {
    socket.emit("move", dx > 0 ? "right" : "left");
  } else {
    socket.emit("move", dy > 0 ? "down" : "up");
  }
});

// PCのマウス操作
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  socket.emit("moveTo", { x, y });
});



