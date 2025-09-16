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
  let images = {};
  const fieldImg = new Image();
  fieldImg.src = "/assets/field.png"; // フィールド画像

  // キャラ画像 4種類
  const assetList = [
    "/assets/char1.png",
    "/assets/char2.png",
    "/assets/char3.png",
    "/assets/char4.png"
  ];

  // 画像読み込み
  assetList.forEach((src, i) => {
    const img = new Image();
    img.src = src;
    images[i] = img;
  });

  // サーバーからプレイヤー状態を受信
  socket.on("state", (serverPlayers) => {
    players = serverPlayers;
    draw();
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
      if (img) {
        const charSize = canvas.width * 0.1; // 画面幅の10%
        ctx.drawImage(img, p.x, p.y, charSize, charSize);

        // HPバー
        ctx.fillStyle = "red";
        ctx.fillRect(p.x, p.y - 12, charSize, 5);
        ctx.fillStyle = "green";
        ctx.fillRect(p.x, p.y - 12, (p.hp / 100) * charSize, 5);
      }
    }
  }

  // スマホスワイプ操作
  let startX, startY;
  const moveSpeed = 20;

  canvas.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
  });

  canvas.addEventListener("touchend", (e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    let moveX = 0, moveY = 0;
    if (Math.abs(dx) > Math.abs(dy)) moveX = dx > 0 ? moveSpeed : -moveSpeed;
    else moveY = dy > 0 ? moveSpeed : -moveSpeed;

    socket.emit("move", { x: moveX, y: moveY });
  });

  // PC クリック操作（任意）
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    socket.emit("moveTo", { x, y });
  });
});

