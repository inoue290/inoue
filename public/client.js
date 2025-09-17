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

const friction = 0.95;  // 摩擦係数
const minVelocity = 0.5; // これ以下になったら停止
const size = 50; // キャラクターサイズ

// ベクトル反射関数
function reflectVector(vx, vy, nx, ny) {
  const dot = vx * nx + vy * ny; // 内積
  return {
    x: vx - 2 * dot * nx,
    y: vy - 2 * dot * ny
  };
}

canvas.addEventListener("touchstart", e => {
  const t = e.touches[0];
  startX = t.clientX;
  startY = t.clientY;
});

canvas.addEventListener("touchend", e => {
  const t = e.changedTouches[0];
  const dx = t.clientX - startX;
  const dy = t.clientY - startY;

  const scale = 0.3; // スワイプ距離 → 速度スケーリング
  velocityX = dx * scale;
  velocityY = dy * scale;

  if (!isMoving) {  // ★二重実行を防ぐ
    isMoving = true;
    animateMove();
  }
});

function animateMove() {
  if (!isMoving) return;

  // 速度が小さくなったら停止
  if (Math.abs(velocityX) < minVelocity && Math.abs(velocityY) < minVelocity) {
    isMoving = false;
    return;
  }

  // 座標更新
  players.x += velocityX;
  players.y += velocityY;

  // 壁での反射処理
  // 左右の壁
  if (players.x <= 0) {
    players.x = 0;
    const r = reflectVector(velocityX, velocityY, 1, 0); // 法線 (1,0)
    velocityX = r.x;
    velocityY = r.y;
  } else if (players.x + size >= canvas.width) {
    players.x = canvas.width - size;
    const r = reflectVector(velocityX, velocityY, -1, 0); // 法線 (-1,0)
    velocityX = r.x;
    velocityY = r.y;
  }

  // 上下の壁
  if (players.y <= 0) {
    players.y = 0;
    const r = reflectVector(velocityX, velocityY, 0, 1); // 法線 (0,1)
    velocityX = r.x;
    velocityY = r.y;
  } else if (players.y + size >= canvas.height) {
    players.y = canvas.height - size;
    const r = reflectVector(velocityX, velocityY, 0, -1); // 法線 (0,-1)
    velocityX = r.x;
    velocityY = r.y;
  }

  // 慣性減速
  velocityX *= friction;
  velocityY *= friction;

  // サーバー送信など
  socket.emit("move", { x: players.x, y: players.y });

  requestAnimationFrame(animateMove);
}
});





