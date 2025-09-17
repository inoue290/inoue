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

  // --- 前提 ---
  // players は { id1: {x,y,hp,asset,direction}, id2: {...}, ... } の形である想定。
  // socket は socket.io のソケット（ある場合）。なければ最初のプレイヤーを local に使う。

  // スワイプ操作
  let startX, startY;
  let velocityX = 0;
  let velocityY = 0;
  let isMoving = false;
  
  // local player id（接続時に socket.id をセットして使うのが理想）
  let localPlayerId = null;
  
  const friction = 0.95;  // 摩擦係数
  const minVelocity = 0.5; // これ以下になったら停止
  
  // ベクトル反射関数
  function reflectVector(vx, vy, nx, ny) {
    const dot = vx * nx + vy * ny; // 内積
    return {
      x: vx - 2 * dot * nx,
      y: vy - 2 * dot * ny
    };
  }
  
  // ローカルプレイヤーを確実に得るヘルパー
  function ensureLocalPlayer() {
    // 既に localPlayerId があり players にあればそれを返す
    if (localPlayerId && players[localPlayerId]) return players[localPlayerId];
  
    // socket.id があれば優先して使う
    if (typeof socket !== "undefined" && socket.id && players[socket.id]) {
      localPlayerId = socket.id;
      return players[localPlayerId];
    }
  
    // それ以外は players の最初のキーを使う（単一プレイヤー環境向け）
    const keys = Object.keys(players);
    if (keys.length) {
      localPlayerId = keys[0];
      return players[localPlayerId];
    }
  
    // それでも無ければ仮のローカルプレイヤーを作る
    localPlayerId = "local";
    players[localPlayerId] = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      hp: 100,
      asset: null,
      direction: "right"
    };
    return players[localPlayerId];
  }
  
  // socket.io を使ってるなら接続時に localPlayerId を更新しておくと確実
  if (typeof socket !== "undefined") {
    socket.on("connect", () => {
      localPlayerId = socket.id; // server と players の整合が取れていればこれでOK
    });
  }
  
  canvas.addEventListener("touchstart", e => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
  });
  
  canvas.addEventListener("touchend", e => {
    const me = ensureLocalPlayer();
    if (!me) return;
  
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
  
    const scale = 0.3; // スワイプ距離 → 速度スケーリング
    velocityX = dx * scale;
    velocityY = dy * scale;
  
    // 向き判定（画像反転用）
    if (velocityX < -0.5) me.direction = "left";
    else if (velocityX > 0.5) me.direction = "right";
  
    // 既にアニメーションが走っていなければ起動（重複起動を防止）
    if (!isMoving) {
      isMoving = true;
      requestAnimationFrame(animateMove);
    }
  });
  
  function animateMove() {
    if (!isMoving) return;
  
    const me = ensureLocalPlayer();
    if (!me) {
      isMoving = false;
      return;
    }
  
    // キャラ描画サイズ（描画ループで使っているサイズに合わせる）
    const charSize = Math.max(32, canvas.width * 0.15);
  
    // 速度が小さくなったら停止
    if (Math.abs(velocityX) < minVelocity && Math.abs(velocityY) < minVelocity) {
      velocityX = 0;
      velocityY = 0;
      isMoving = false;
      // 最終位置をサーバーに送る（必要なら）
      if (typeof socket !== "undefined") socket.emit("move", { x: me.x, y: me.y, direction: me.direction });
      return;
    }
  
    // 座標更新
    me.x += velocityX;
    me.y += velocityY;
  
    // 壁での反射処理（衝突したら位置を境界内に戻して反射ベクトルを計算）
    // 左壁
    if (me.x <= 0) {
      me.x = 0;
      const r = reflectVector(velocityX, velocityY, 1, 0);
      velocityX = r.x;
      velocityY = r.y;
      me.direction = velocityX < 0 ? "left" : "right";
    }
    // 右壁
    else if (me.x + charSize >= canvas.width) {
      me.x = canvas.width - charSize;
      const r = reflectVector(velocityX, velocityY, -1, 0);
      velocityX = r.x;
      velocityY = r.y;
      me.direction = velocityX < 0 ? "left" : "right";
    }
  
    // 上壁
    if (me.y <= 0) {
      me.y = 0;
      const r = reflectVector(velocityX, velocityY, 0, 1);
      velocityX = r.x;
      velocityY = r.y;
    }
    // 下壁
    else if (me.y + charSize >= canvas.height) {
      me.y = canvas.height - charSize;
      const r = reflectVector(velocityX, velocityY, 0, -1);
      velocityX = r.x;
      velocityY = r.y;
    }
  
    // 慣性減速
    velocityX *= friction;
    velocityY *= friction;
  
    // サーバー送信など（位置と向き）
    if (typeof socket !== "undefined") {
      socket.emit("move", { x: me.x, y: me.y, direction: me.direction });
    }
  
    // 次フレーム
    requestAnimationFrame(animateMove);
  }

});






