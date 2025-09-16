document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // 縦長スマホ対応
  function resizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  let players = {};
  let images = {};
  const fieldImg = new Image();
  fieldImg.src = "/assets/field.png";

  const assetList = ["/assets/char1.png","/assets/char2.png","/assets/char3.png","/assets/char4.png"];
  assetList.forEach((src,i)=>{ const img=new Image(); img.src=src; images[src]=img; });

  socket.on("state", (serverPlayers)=>{
    players = serverPlayers;
    draw();
  });

  socket.on("youDied", ()=>{
    window.location.href="/delete.html";
  });

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(fieldImg.complete) ctx.drawImage(fieldImg,0,0,canvas.width,canvas.height);

    for(let id in players){
      const p = players[id];
      const img = images[p.asset];
      if(img && img.complete){
        const size = canvas.width*0.15;
        ctx.drawImage(img, p.x, p.y, size, size);
        ctx.fillStyle="red";
        ctx.fillRect(p.x,p.y-12,size,5);
        ctx.fillStyle="green";
        ctx.fillRect(p.x,p.y-12,(p.hp/100)*size,5);
      }
    }
  }

  // スワイプ操作
  let startX,startY;
  const moveSpeed = 20;
  canvas.addEventListener("touchstart",(e)=>{
    const t=e.touches[0];
    startX=t.clientX; startY=t.clientY;
  });
  canvas.addEventListener("touchend",(e)=>{
    const t=e.changedTouches[0];
    let dx=0,dy=0;
    const diffX=t.clientX-startX;
    const diffY=t.clientY-startY;
    if(Math.abs(diffX)>Math.abs(diffY)) dx=diffX>0?moveSpeed:-moveSpeed;
    else dy=diffY>0?moveSpeed:-moveSpeed;
    socket.emit("move",{x:dx,y:dy});
  });
});
