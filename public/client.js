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
  let enemies = {};
  let myPlayerId = null;
  const images = {};

  // フィールド画像
  const fieldImg = new Image();
  fieldImg.src = "/assets/field.png";
  fieldImg.onload = draw;

  // プレイヤー画像
  const assetList = ["char1.png","char2.png","char3.png","char4.png"];
  assetList.forEach(src => {
    const img = new Image();
    img.src = "/assets/" + src;
    img.onload = draw;
    images[src] = img;
  });

  // 敵画像
  const enemyAssetList = ["enemy1.png","enemy2.png"];
  enemyAssetList.forEach(src => {
    const img = new Image();
    img.src = "/assets/" + src;
    img.onload = draw;
    images[src] = img;
  });

  socket.on("myId", id => myPlayerId = id);

  socket.on("state", ({ players: serverPlayers, enemies: serverEnemies }) => {
    players = serverPlayers;
    enemies = serverEnemies;
    draw();
  });

  socket.on("youDied", () => window.location.href = "/delete.html");

  // --- キャラクター選択 ---
  window.chooseCharacter = function(assetName) {
    socket.emit("chooseCharacter", assetName);
    document.getElementById("charSelect").style.display = "none";
  };

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (fieldImg.complete) ctx.drawImage(fieldImg, 0, 0, canvas.width, canvas.height);

    // プレイヤー描画
    for (let id in players) {
      const p = players[id];
      if (!p.asset) continue; // キャラ未選択は描画しない
      const img = images[p.asset];
      if (!img || !img.complete) continue;

      const size = 75;
      ctx.save();
      if (p.dir === -1) {
        ctx.translate(p.x + size/2, 0);
        ctx.scale(-1,1);
        ctx.drawImage(img, -size/2, p.y, size, size);
      } else {
        ctx.drawImage(img, p.x, p.y, size, size);
      }
      ctx.restore();

      // HPバー
      ctx.fillStyle = "red";
      ctx.fillRect(p.x, p.y - 12, size, 5);
      ctx.fillStyle = "green";
      ctx.fillRect(p.x, p.y - 12, (p.hp/100)*size, 5);
    }

    // 敵描画
    for (let id in enemies) {
      const e = enemies[id];
      const img = images[e.asset];
      if (!img || !img.complete) continue;
      const size = 120;
      ctx.save();
      if (e.dir === -1) {
        ctx.translate(e.x + size/2, 0);
        ctx.scale(-1,1);
        ctx.drawImage(img, -size/2, e.y, size, size);
      } else {
        ctx.drawImage(img, e.x, e.y, size, size);
      }
      ctx.restore();

      // HPバー
      ctx.fillStyle = "red";
      ctx.fillRect(e.x, e.y - 12, size, 5);
      ctx.fillStyle = "green";
      ctx.fillRect(e.x, e.y - 12, (e.hp/50)*size, 5);
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
    const scale = 0.18;
    socket.emit("move", { x: dx*scale, y: dy*scale });
    const attackPower = 10;
    socket.emit("attack", { dx, dy, power: attackPower });
  });

  function animate() {
    draw();
    requestAnimationFrame(animate);
  }
  animate();
});

