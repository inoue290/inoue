document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // canvasサイズ調整
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
    if (!myPlayerId) myPlayerId = Object.keys(players)[0];
    draw();
  });

  // 自分が死亡したら delete.html に遷移
  socket.on("youDied", () => window.location.href = "/delete.html");

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (fieldImg.complete) ctx.drawImage(fieldImg, 0, 0, canvas.width, canvas.height);

    for (let id in players) {
      const p = players[id];
      const img = images[p.asset];
      if (img && img.complete) {
        const size = canvas.width * 0.15;
        ctx.drawImage(img, p.x, p.y, size, size);

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
  const friction = 0.95;
  const minVelocity = 0.5;
  const size = 50; // キャラサイズ

  canvas.addEventListener("touchstart", e => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
  });

  canvas.addEventListener("touchend", e => {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    const scale = 0.3;
    velocityX = dx * scale;
    velocityY = dy * scale;

    if (!isMoving) {
      isMoving = true;
      animateMove();
    }
  });

  function animateMove() {
    if (!isMoving) return;
    if (!myPlayerId || !players[myPlayerId]) return;

    const me = players[myPlayerId];

    // 速度が小さくなったら停止
    if (Math.abs(velocityX) < minVelocity && Math.abs(velocityY) < minVelocity) {
      isMoving = false;
      return;
    }

    // 座標更新（クライアント描画用）
    me.x += velocityX;
    me.y += velocityY;

    // 壁判定＆反射
    if (me.x <= 0) { me.x = 0; velocityX = -velocityX; }
    else if (me.x + size >= canvas.width) { me.x = canvas.width - size; velocityX = -velocityX; }
    if (me.y <= 0) { me.y = 0; velocityY = -velocityY; }
    else if (me.y + size >= canvas.height) { me.y = canvas.height - size; velocityY = -velocityY; }

    // 慣性減速
    velocityX *= friction;
    velocityY *= friction;

    // サーバー送信（加算分のみ）
    socket.emit("move", { x: velocityX, y: velocityY });

    draw();
    requestAnimationFrame(animateMove);
  }
});
