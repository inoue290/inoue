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

    // 向き情報を持たせる（初回のみ）
    for (let id in players) {
      if (!players[id].dir) players[id].dir = 1; // 初期は右向き
    }

    if (!myPlayerId) myPlayerId = Object.keys(players)[0];
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
          ctx.translate(p.x + size / 2, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, -size / 2, p.y, size, size);
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
  let velocityX = 0, velocityY = 0;
  let isMoving = false;
  const scale = 0.3;

  canvas.addEventListener("touchstart", e => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
  });

  canvas.addEventListener("touchend", e => {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    velocityX = dx * scale;
    velocityY = dy * scale;

    // 向きを更新（右向き or 左向き）
    if (myPlayerId && players[myPlayerId]) {
      players[myPlayerId].dir = dx >= 0 ? 1 : -1;
    }

    if (!isMoving) {
      isMoving = true;
      animateMove();
    }
  });

  function animateMove() {
    if (!isMoving) return;

    // 速度が小さくなったら停止
    if (Math.abs(velocityX) < 0.5 && Math.abs(velocityY) < 0.5) {
      isMoving = false;
      return;
    }

    if (!myPlayerId || !players[myPlayerId]) return;
    const p = players[myPlayerId];
    const size = canvas.width * 0.15;

    // 壁判定（クライアント描画用）
    if (p.x + velocityX <= 0 || p.x + velocityX + size >= canvas.width) {
      velocityX = -velocityX;           // ベクトル反転
      p.dir = -p.dir;                   // 向き反転
    }
    if (p.y + velocityY <= 0 || p.y + velocityY + size >= canvas.height) {
      velocityY = -velocityY;           // Y軸反射
    }

    // サーバー送信（加算分のみ）
    socket.emit("move", { x: velocityX, y: velocityY });

    // 慣性減速
    velocityX *= 0.95;
    velocityY *= 0.95;

    draw();
    requestAnimationFrame(animateMove);
  }
});
