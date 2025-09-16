const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let players = {};
let fieldImg = new Image();
fieldImg.src = "assets/field.png"; // 背景画像

socket.on("currentPlayers", (serverPlayers) => {
  players = serverPlayers;
  draw();
});

socket.on("newPlayer", (player) => {
  players[player.id] = { x: player.x, y: player.y, hp: player.hp, asset: player.asset };
  draw();
});

socket.on("playerMoved", (player) => {
  players[player.id] = player;
  draw();
});

socket.on("playerHit", (data) => {
  if (players[data.id]) {
    players[data.id].hp = data.hp;
    draw();
  }
});

socket.on("playerDead", (id) => {
  delete players[id];
  draw();
});

socket.on("playerLeft", (id) => {
  delete players[id];
  draw();
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (fieldImg.complete) ctx.drawImage(fieldImg, 0, 0, canvas.width, canvas.height);

  for (let id in players) {
    const p = players[id];
    const img = new Image();
    img.src = "assets/" + p.asset;
    ctx.drawImage(img, p.x, p.y, 64, 64);

    // HPバー
    ctx.fillStyle = "red";
    ctx.fillRect(p.x, p.y - 10, 64, 5);
    ctx.fillStyle = "green";
    ctx.fillRect(p.x, p.y - 10, (p.hp / 100) * 64, 5);
  }
}

// スマホスワイプ
let startX, startY;
canvas.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  startX = t.clientX;
  startY = t.clientY;
});
canvas.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  let dx = t.clientX - startX;
  let dy = t.clientY - startY;
  const moveAmount = 10;
  let moveX = 0, moveY = 0;
  if (Math.abs(dx) > Math.abs(dy)) moveX = dx > 0 ? moveAmount : -moveAmount;
  else moveY = dy > 0 ? moveAmount : -moveAmount;
  socket.emit("move", { x: moveX, y: moveY });
});

// PC クリックで移動
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  // 簡単にクリック方向に移動
  let dx = x - 200; // canvas中心からの差
  let dy = y - 300;
  socket.emit("move", { x: dx > 0 ? 10 : -10, y: dy > 0 ? 10 : -10 });
});



