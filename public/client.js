document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  let players = {};
  let myPlayerId = null;
  const images = {};

  // フィールド画像
  const fieldImg = new Image();
  fieldImg.src = "/assets/field.png";
  fieldImg.onload = draw;

  // キャラクター画像
  const assetList = ["char1.png","char2.png","char3.png","char4.png"];
  assetList.forEach(src => {
    const img = new Image();
    img.src = "/assets/" + src;
    img.onload = draw;
    images[src] = img;
  });

  // サーバーからプレイヤー情報を受信
  socket.on("state", serverPlayers => {
    players = serverPlayers;
    // 初回だけ自分のIDを取得
    if (!myPlayerId) {
      myPlayerId = Object.keys(players)[0];
    }
    // 向き情報初期化
    for (let id in players) {
      if (players[id].dir === undefined) players[id].dir = 1;
      // 描画向きは速度Xの符号に従う
      if (players[id].vx !== undefined) players[id].dir = players[id].vx >= 0 ? 1 : -1;
    }
    draw();
  });

  socket.on("youDied", () => window.location.href = "/delete.html");

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (fieldImg.complete) ctx.drawImage(fieldImg, 0, 0, canvas.width, canvas.height);

    for (let id in players) {
      const p = players[id];
      const img = images[p.asset];
      if (img && img.complete) {
        const size = canvas.width * 0.15;

        ctx.save();
        if (p.dir === -1) {
          ctx.translate(p.x + size/2, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, -size/2, p.y, size, size);
        } else {
          ctx.drawImage(img, p.x, p.y, size, size);
        }
        ctx.restore();

        // HPバー
        ctx.fillStyle = "red";
        ctx.fillRect(p.x, p.y - 12, size, 5);
        ctx.fillStyle = "green";
        ctx.fillRect(p.x, p.y - 12, (p.hp / 100) * size, 5);
      }
    }
  }

  // --- スワイプ操作 ---
  let startX, startY;

  canvas.addEventListener("touchstart", e => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
  });

  canvas.addEventListener("touchend", e => {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    const scale = 0.3; // スワイプ距離→速度
    const vx = dx * scale;
    const vy = dy * scale;

    // サーバーに移動量を送信
    socket.emit("move", { x: vx, y: vy });
  });

  // クライアント側は描画のみ
  function animate() {
    draw();
    requestAnimationFrame(animate);
  }
  animate();
});


