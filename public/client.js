document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // 縦長スマホ画面に合わせて canvas サイズ
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  let players = {};
  const images = {};

  // フィールド画像
  const fieldImg = new Image();
  fieldImg.src = "/assets/field.png";
  fieldImg.onload = () => draw();

  // キャラクター画像（サーバーとキーを統一）
  const assetList = ["char1.png", "char2.png", "char3.png", "char4.png"];
  assetList.forEach(src => {
    const img = new Image();
    img.src = "/assets/" + src;
    img.onload = () => draw();
    images[src] = img;
  });

  // サーバーからプレイヤー情報を受信
  socket.on("state", serverPlayers => {
    players = serverPlayers;
    draw();
  });

  // 自分が死亡したら delete.html に遷移
  socket.on("youDied", () => {
    window.location.href = "/delete.html";
  });

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景描画
    if (fieldImg.complete) {
      ctx.drawImage(fieldImg, 0, 0, canvas.width, canvas.height);
    }

    // 各プレイヤー描画
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

  // スワイプ操作
  let startX, startY;
  let velocityX = 0;
  let velocityY = 0;
  let isMoving = false;
  
  const friction = 0.95; // 摩擦係数（0.9〜0.98くらいで調整）
  const minVelocity = 0.5; // これ以下になったら止める
  
  canvas.addEventListener("touchstart", e => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    isMoving = false; // 新しいスワイプ開始で移動停止
  });
  
  canvas.addEventListener("touchend", e => {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
  
    const scale = 0.3; // スワイプ距離 → 速度スケーリング
    velocityX = dx * scale;
    velocityY = dy * scale;
  
    isMoving = true;
    animateMove();
  });
  
  function animateMove() {
    if (!isMoving) return;
  
    // 速度が小さくなったら止める
    if (Math.abs(velocityX) < minVelocity && Math.abs(velocityY) < minVelocity) {
      isMoving = false;
      return;
    }
  
    // 位置更新（Socketへ送信など）
    socket.emit("move", { x: velocityX, y: velocityY });
  
    // 慣性（減速）
    velocityX *= friction;
    velocityY *= friction;
  
    // 次のフレームへ
    requestAnimationFrame(animateMove);
  }
});

