document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // 画面サイズに合わせて canvas を設定（縦長）
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  let players = {};
  let images = {};
  const fieldImg = new Image();
  fieldImg.src = "/assets/field.png";

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
        const charWidth = canvas.width * 0.1; // 画面幅の10%
        const charHeight = charWidth;
        ctx.drawImage(img, p.x, p.y, charWidth, charHeight);

        // HPバー
        ctx.fillStyle = "red";
        ctx.fillRect(p.x, p.y - 12, charWidth, 5);
        ctx.fillStyle = "green";
        ctx.fillRect(p.x, p.y - 12, (p.hp / 100) * charWidth, 5);
      }
    }
  }

  // スマホ用スワイプ操作
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

  // PC マウス操作（クリックした位置に移動）
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    socket.emit("moveTo", { x, y });
  });
});



