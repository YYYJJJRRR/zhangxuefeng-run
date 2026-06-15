const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const hiScoreEl = document.querySelector("#hiScore");
const overlay = document.querySelector("#startOverlay");
const restartBtn = document.querySelector("#restartBtn");
const jumpBtn = document.querySelector("#jumpBtn");
const duckBtn = document.querySelector("#duckBtn");

const W = canvas.width;
const H = canvas.height;
const groundY = 236;
const storageKey = "zhang-run-hi-score";
const runnerSprites = {
  normal: new Image(),
  duck: new Image(),
};

runnerSprites.normal.src = "./assets/runner-normal.png";
runnerSprites.duck.src = "./assets/runner-duck.png";

const spriteScale = { normal: 1, duck: 1 };

const game = {
  running: false,
  over: true,
  score: 0,
  hiScore: Number(localStorage.getItem(storageKey) || 1021),
  speed: 6.2,
  spawnTimer: 0,
  nextSpawn: 92,
  frame: 0,
  lastTime: 0,
  ducking: false,
  jumpHeld: false,
};

const runner = {
  x: 94,
  y: groundY - 86,
  w: 66,
  h: 86,
  vy: 0,
  grounded: true,
  jumpTicks: 0,
};

const obstacles = [];
const dust = [];

function padScore(value) {
  return String(Math.floor(value)).padStart(5, "0").slice(-5);
}

function syncScore() {
  scoreEl.textContent = padScore(game.score);
  hiScoreEl.textContent = padScore(game.hiScore);
}

function resetGame() {
  game.running = true;
  game.over = false;
  game.score = 0;
  game.speed = 6.2;
  game.spawnTimer = 0;
  game.nextSpawn = 76;
  game.frame = 0;
  game.ducking = false;
  game.jumpHeld = false;
  runner.y = groundY - runner.h;
  runner.vy = 0;
  runner.grounded = true;
  runner.jumpTicks = 0;
  obstacles.length = 0;
  dust.length = 0;
  overlay.classList.remove("is-visible");
  syncScore();
}

function endGame() {
  game.running = false;
  game.over = true;
  game.hiScore = Math.max(game.hiScore, Math.floor(game.score));
  localStorage.setItem(storageKey, String(game.hiScore));
  syncScore();
  overlay.classList.add("is-visible");
}

function startJump() {
  if (game.over) {
    resetGame();
    return;
  }
  game.jumpHeld = true;
  if (runner.grounded) {
    runner.vy = -13.5;
    runner.grounded = false;
    runner.jumpTicks = 0;
    addDust(runner.x + 12, groundY - 8, 5);
  }
}

function releaseJump() {
  game.jumpHeld = false;
}

function setDuck(value) {
  game.ducking = value && !runner.grounded ? false : value;
  duckBtn.classList.toggle("is-pressed", value);
}

function addDust(x, y, count = 1) {
  for (let i = 0; i < count; i += 1) {
    dust.push({
      x: x + Math.random() * 18,
      y: y + Math.random() * 12,
      r: 2 + Math.random() * 4,
      vx: -1.8 - Math.random() * 1.6,
      life: 32 + Math.random() * 12,
    });
  }
}

function spawnObstacle() {
  const roll = Math.random();
  const isHigh = roll > 0.72 && game.score > 220;
  const isTall = roll < 0.32;
  const obstacle = {
    x: W + 34,
    y: isHigh ? groundY - 120 : groundY - (isTall ? 72 : 54),
    w: isHigh ? 78 : isTall ? 40 : 48,
    h: isHigh ? 48 : isTall ? 72 : 54,
    type: isHigh ? "sprite" : "chocobar",
    passed: false,
    variant: isTall ? "tall" : "short",
  };
  obstacles.push(obstacle);
  game.nextSpawn = 58 + Math.random() * Math.max(34, 72 - game.speed * 4);
}

function runnerBox() {
  if (game.ducking && runner.grounded) {
    return { x: runner.x + 8, y: runner.y + 38, w: 66, h: 42 };
  }
  return { x: runner.x + 10, y: runner.y + 8, w: 48, h: 76 };
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update(dt) {
  if (!game.running) return;
  const step = dt / 16.67;
  game.frame += step;
  game.score += step * 0.62;
  game.speed = Math.min(13.8, 6.2 + game.score / 260);

  if (!runner.grounded && game.jumpHeld && runner.jumpTicks < 13 && runner.vy < -4.5) {
    runner.vy -= 0.42 * step;
    runner.jumpTicks += step;
  }

  runner.vy += 0.76 * step;
  runner.y += runner.vy * step;
  if (runner.y >= groundY - runner.h) {
    runner.y = groundY - runner.h;
    runner.vy = 0;
    runner.grounded = true;
  }

  game.spawnTimer += step;
  if (game.spawnTimer > game.nextSpawn) {
    game.spawnTimer = 0;
    spawnObstacle();
  }

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = obstacles[i];
    obstacle.x -= game.speed * step;
    if (!obstacle.passed && obstacle.x + obstacle.w < runner.x) {
      obstacle.passed = true;
      game.score += 24;
    }
    if (obstacle.x + obstacle.w < -30) obstacles.splice(i, 1);
  }

  if (runner.grounded && game.frame % 8 < step) addDust(runner.x + 8, groundY - 9, 1);
  for (let i = dust.length - 1; i >= 0; i -= 1) {
    dust[i].x += dust[i].vx * step;
    dust[i].life -= step;
    if (dust[i].life <= 0) dust.splice(i, 1);
  }

  const box = runnerBox();
  if (obstacles.some((obstacle) => intersects(box, obstacle))) endGame();
  syncScore();
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawRunnerSprite(duck) {
  const image = duck ? runnerSprites.duck : runnerSprites.normal;
  if (!image.complete || image.naturalWidth === 0) return false;

  const scale = duck ? spriteScale.duck : spriteScale.normal;
  const height = (duck ? 105 : 120) * scale;
  const width = (image.naturalWidth / image.naturalHeight) * height;
  const drawX = duck ? runner.x - 12 : runner.x - 20;
  const drawY = duck ? groundY - height : runner.y + runner.h - height;

  ctx.save();
  ctx.globalAlpha = game.over ? 0.25 : 1;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, drawX, drawY, width, height);
  ctx.restore();
  return true;
}

function drawRunner() {
  const duck = game.ducking && runner.grounded;
  if (drawRunnerSprite(duck)) return;

  const leg = Math.sin(game.frame * 0.42);
  const x = runner.x;
  const y = duck ? groundY - 58 : runner.y;
  const footY = duck ? groundY - 9 : y + runner.h - 9;

  ctx.save();
  ctx.globalAlpha = game.over ? 0.25 : 1;
  ctx.imageSmoothingEnabled = false;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const skin = "#f0b184";
  const ink = "#202927";
  const shirt = "#fffdfa";
  const pants = "#171b1c";
  const sole = "#0b0e0f";
  const outline = "#27332e";

  function fillStroke(fill, stroke = outline, width = 3) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.fill();
    ctx.stroke();
  }

  function limb(points, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
    ctx.stroke();
  }

  function shoe(cx, cy, angle = 0, scale = 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = sole;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    roundedRect(-14 * scale, -5 * scale, 28 * scale, 10 * scale, 5 * scale);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawHead(cx, cy, scale = 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = "#15191a";
    ctx.beginPath();
    ctx.moveTo(-26, -10);
    ctx.lineTo(-20, -24);
    ctx.lineTo(-10, -30);
    ctx.lineTo(-4, -36);
    ctx.lineTo(5, -29);
    ctx.lineTo(13, -35);
    ctx.lineTo(18, -26);
    ctx.lineTo(28, -28);
    ctx.lineTo(24, -17);
    ctx.lineTo(33, -15);
    ctx.lineTo(25, -8);
    ctx.lineTo(28, 0);
    ctx.lineTo(-24, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = skin;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-23, -8);
    ctx.quadraticCurveTo(-22, 20, 3, 27);
    ctx.quadraticCurveTo(28, 24, 36, 5);
    ctx.quadraticCurveTo(26, -12, 2, -14);
    ctx.quadraticCurveTo(-14, -14, -23, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(-24, 5, 6, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#1f2525";
    ctx.lineWidth = 2.2;
    ctx.strokeRect(1, -2, 12, 7);
    ctx.strokeRect(16, -2, 12, 7);
    ctx.beginPath();
    ctx.moveTo(13, 1);
    ctx.lineTo(16, 1);
    ctx.moveTo(28, 0);
    ctx.lineTo(35, -3);
    ctx.stroke();

    ctx.fillStyle = "#1f2525";
    ctx.fillRect(6, 0, 3, 2);
    ctx.fillRect(21, 0, 3, 2);

    ctx.strokeStyle = "#c35f42";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(22, 12, 7, 0.15, 2.65);
    ctx.stroke();

    ctx.restore();
  }

  function drawMicrophone(mx, my, scale = 1) {
    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#303739";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -5, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-1, 1);
    ctx.lineTo(8, 15);
    ctx.stroke();
    ctx.restore();
  }

  if (duck) {
    limb([[x + 24, y + 39], [x + 9, y + 50], [x - 4, y + 51]], skin, 9);
    limb([[x + 57, y + 43], [x + 74, y + 48], [x + 88, y + 50]], skin, 9);
    drawMicrophone(x + 93, y + 49, 0.72);

    ctx.beginPath();
    ctx.moveTo(x + 14, y + 35);
    ctx.quadraticCurveTo(x + 36, y + 20, x + 74, y + 33);
    ctx.lineTo(x + 66, y + 56);
    ctx.quadraticCurveTo(x + 35, y + 59, x + 13, y + 48);
    ctx.closePath();
    fillStroke(shirt, outline, 3);

    ctx.strokeStyle = "#d9d9d2";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 37, y + 30);
    ctx.lineTo(x + 31, y + 53);
    ctx.moveTo(x + 45, y + 31);
    ctx.lineTo(x + 53, y + 53);
    ctx.stroke();

    limb([[x + 35, y + 55], [x + 20, y + 67], [x + 2, y + 73]], pants, 13);
    limb([[x + 54, y + 55], [x + 69, y + 65], [x + 87, y + 66]], pants, 13);
    shoe(x - 3, y + 75, -0.08, 0.86);
    shoe(x + 91, y + 67, 0.02, 0.82);
    drawHead(x + 70, y + 16, 0.82);
  } else {
    limb([[x + 18, y + 57], [x + 6, y + 71], [x + 1, y + 84]], skin, 9);
    limb([[x + 63, y + 57], [x + 79, y + 48], [x + 91, y + 51]], skin, 9);
    drawMicrophone(x + 96, y + 49, 0.78);

    ctx.beginPath();
    ctx.moveTo(x + 20, y + 45);
    ctx.quadraticCurveTo(x + 40, y + 38, x + 66, y + 48);
    ctx.lineTo(x + 60, y + 77);
    ctx.quadraticCurveTo(x + 36, y + 84, x + 16, y + 70);
    ctx.closePath();
    fillStroke(shirt, outline, 3);

    ctx.strokeStyle = "#d8d8d0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 39, y + 43);
    ctx.lineTo(x + 33, y + 77);
    ctx.moveTo(x + 47, y + 45);
    ctx.lineTo(x + 56, y + 74);
    ctx.stroke();

    limb([[x + 34, y + 78], [x + 19 + leg * 6, y + 96], [x + 7 + leg * 10, footY]], pants, 13);
    limb([[x + 53, y + 78], [x + 72 - leg * 7, y + 92], [x + 88 - leg * 8, footY + 1]], pants, 13);
    shoe(x + 5 + leg * 10, footY + 2, -0.35, 0.92);
    shoe(x + 91 - leg * 8, footY + 2, -0.1, 0.92);
    drawHead(x + 59, y + 18, 0.9);
  }

  ctx.restore();
}

function drawSpriteBottle(obstacle) {
  ctx.translate(obstacle.x, obstacle.y);
  ctx.rotate(-0.24);

  ctx.fillStyle = "#66c95f";
  roundedRect(10, 10, 58, 22, 11);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#dff8d9";
  roundedRect(18, 13, 28, 16, 8);
  ctx.fill();

  ctx.fillStyle = "#1b8f4d";
  ctx.font = "900 14px Microsoft YaHei";
  ctx.fillText("雪碧", 19, 27);

  ctx.fillStyle = "#f3fff1";
  ctx.fillRect(58, 14, 12, 14);
  ctx.strokeRect(58, 14, 12, 14);

  ctx.fillStyle = "#2fa853";
  roundedRect(69, 16, 8, 10, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.beginPath();
  ctx.arc(18, 17, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawChocobar(obstacle) {
  const x = obstacle.x;
  const y = obstacle.y;
  const tall = obstacle.variant === "tall";
  const barW = tall ? 32 : 40;
  const barH = tall ? 54 : 38;
  const barX = x + (obstacle.w - barW) / 2;
  const barY = y + 2;

  ctx.fillStyle = "#d7b077";
  roundedRect(x + obstacle.w / 2 - 5, barY + barH - 2, 10, 22, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#7a3f25";
  roundedRect(barX, barY, barW, barH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f0c46e";
  ctx.beginPath();
  ctx.ellipse(barX + barW * 0.35, barY + barH * 0.36, barW * 0.18, barH * 0.16, -0.35, 0, Math.PI * 2);
  ctx.ellipse(barX + barW * 0.66, barY + barH * 0.58, barW * 0.17, barH * 0.15, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#fff2d8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(barX + 7, barY + 13);
  ctx.lineTo(barX + barW - 8, barY + 9);
  ctx.moveTo(barX + 8, barY + barH - 14);
  ctx.lineTo(barX + barW - 7, barY + barH - 18);
  ctx.stroke();
}

function drawSpriteBottleRef(obstacle) {
  ctx.translate(obstacle.x, obstacle.y);
  ctx.rotate(-0.42);
  ctx.scale(1.05, 0.92);

  ctx.strokeStyle = "#1d7f3f";
  ctx.lineWidth = 3;
  ctx.fillStyle = "#39b85c";
  ctx.beginPath();
  ctx.moveTo(3, 24);
  ctx.quadraticCurveTo(8, 8, 23, 8);
  ctx.lineTo(52, 9);
  ctx.quadraticCurveTo(63, 8, 67, 17);
  ctx.lineTo(72, 31);
  ctx.quadraticCurveTo(59, 43, 38, 42);
  ctx.lineTo(13, 39);
  ctx.quadraticCurveTo(3, 37, 3, 24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#5dd875";
  ctx.beginPath();
  ctx.moveTo(10, 17);
  ctx.quadraticCurveTo(27, 12, 58, 17);
  ctx.quadraticCurveTo(57, 22, 49, 24);
  ctx.quadraticCurveTo(28, 20, 9, 27);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(232,255,222,0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(11, 31);
  ctx.quadraticCurveTo(30, 36, 59, 29);
  ctx.moveTo(18, 15);
  ctx.quadraticCurveTo(23, 26, 18, 37);
  ctx.stroke();

  ctx.save();
  ctx.translate(33, 24);
  ctx.rotate(0.12);
  ctx.fillStyle = "#fbfff0";
  roundedRect(-16, -10, 34, 19, 6);
  ctx.fill();
  ctx.strokeStyle = "#ffe66d";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#168c42";
  ctx.beginPath();
  ctx.moveTo(-9, 5);
  ctx.quadraticCurveTo(0, -11, 12, -4);
  ctx.quadraticCurveTo(4, -1, -1, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#208c43";
  roundedRect(60, 6, 17, 11, 4);
  ctx.fill();
  ctx.strokeStyle = "#116b32";
  ctx.stroke();
  ctx.fillStyle = "#53d36a";
  ctx.fillRect(62, 5, 12, 4);

  ctx.fillStyle = "rgba(236,255,231,0.85)";
  for (const bubble of [
    [17, 23, 2],
    [24, 34, 1.8],
    [47, 17, 1.8],
    [56, 33, 2.2],
  ]) {
    ctx.beginPath();
    ctx.arc(bubble[0], bubble[1], bubble[2], 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChocobarRef(obstacle) {
  const x = obstacle.x;
  const y = obstacle.y;
  const tall = obstacle.variant === "tall";
  const barW = tall ? 34 : 38;
  const barH = tall ? 56 : 46;
  const barX = x + (obstacle.w - barW) / 2;
  const barY = y + (tall ? 0 : 6);

  ctx.fillStyle = "#d7b077";
  roundedRect(x + obstacle.w / 2 - 5, barY + barH - 2, 10, 27, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#8a4b25";
  ctx.beginPath();
  ctx.moveTo(barX + 7, barY + barH);
  ctx.lineTo(barX + barW - 4, barY + barH);
  ctx.quadraticCurveTo(barX + barW + 2, barY + 26, barX + barW - 4, barY + 9);
  ctx.quadraticCurveTo(barX + barW - 14, barY - 3, barX + 6, barY + 2);
  ctx.quadraticCurveTo(barX - 4, barY + 21, barX + 7, barY + barH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f5efe4";
  ctx.beginPath();
  ctx.moveTo(barX + barW - 7, barY + 2);
  ctx.quadraticCurveTo(barX + barW - 1, barY + 9, barX + barW - 9, barY + 16);
  ctx.quadraticCurveTo(barX + barW - 16, barY + 11, barX + barW - 14, barY + 4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(barX + barW - 9, barY + 5);
  ctx.quadraticCurveTo(barX + barW - 8, barY + 12, barX + barW - 13, barY + 17);
  ctx.stroke();

  ctx.fillStyle = "#c48957";
  for (const chip of [
    [0.28, 0.18],
    [0.55, 0.2],
    [0.2, 0.36],
    [0.68, 0.42],
    [0.42, 0.55],
    [0.72, 0.68],
    [0.3, 0.75],
  ]) {
    ctx.beginPath();
    ctx.ellipse(barX + barW * chip[0], barY + barH * chip[1], 2.1, 1.6, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#f6f1e4";
  ctx.strokeStyle = "#8b4d27";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(barX + 6, barY + barH - 18);
  ctx.lineTo(barX + barW - 5, barY + barH - 20);
  ctx.lineTo(barX + barW - 3, barY + barH - 5);
  ctx.lineTo(barX + 4, barY + barH - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#9b5427";
  ctx.font = "900 11px Microsoft YaHei";
  ctx.fillText("巧乐兹", barX + 5, barY + barH - 8);

  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(barX + 8, barY + 10);
  ctx.quadraticCurveTo(barX + 3, barY + 28, barX + 10, barY + barH - 19);
  ctx.stroke();
}

function drawObstacle(obstacle) {
  ctx.save();
  ctx.strokeStyle = "#27332e";
  ctx.lineWidth = 5;
  if (obstacle.type === "sprite") {
    drawSpriteBottleRef(obstacle);
  } else {
    drawChocobarRef(obstacle);
  }
  ctx.restore();
}

function drawConveyor() {
  ctx.fillStyle = "rgba(193, 200, 191, 0.42)";
  roundedRect(22, groundY - 18, W - 44, 34, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(39, 51, 46, 0.18)";
  ctx.lineWidth = 3;
  ctx.stroke();

  const offset = (game.frame * game.speed * 0.6) % 42;
  ctx.strokeStyle = "rgba(39, 51, 46, 0.14)";
  ctx.lineWidth = 4;
  for (let x = 38 - offset; x < W; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, groundY - 14);
    ctx.lineTo(x + 22, groundY + 10);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(39, 51, 46, 0.14)";
  ctx.beginPath();
  ctx.arc(48, groundY, 17, 0, Math.PI * 2);
  ctx.arc(W - 48, groundY, 17, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#fbfcf8";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(33, 120, 79, 0.055)";
  ctx.fillRect(0, groundY + 18, W, 32);

  drawConveyor();

  dust.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life / 40) * 0.45;
    ctx.fillStyle = "#8d958e";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  obstacles.forEach(drawObstacle);
  drawRunner();
}

function loop(time = 0) {
  const dt = Math.min(32, time - (game.lastTime || time));
  game.lastTime = time;
  update(dt || 16.67);
  draw();
  requestAnimationFrame(loop);
}

function bindHold(button, start, end) {
  const begin = (event) => {
    event.preventDefault();
    button.classList.add("is-pressed");
    start();
  };
  const finish = (event) => {
    event.preventDefault();
    button.classList.remove("is-pressed");
    end();
  };
  button.addEventListener("pointerdown", begin);
  button.addEventListener("pointerup", finish);
  button.addEventListener("pointercancel", finish);
  button.addEventListener("pointerleave", finish);
}

bindHold(jumpBtn, startJump, releaseJump);
bindHold(duckBtn, () => setDuck(true), () => setDuck(false));

restartBtn.addEventListener("click", resetGame);
canvas.addEventListener("pointerdown", startJump);
canvas.addEventListener("pointerup", releaseJump);

window.addEventListener("keydown", (event) => {
  if (["Space", "ArrowUp"].includes(event.code)) {
    event.preventDefault();
    startJump();
  }
  if (event.code === "ArrowDown") {
    event.preventDefault();
    setDuck(true);
  }
});

window.addEventListener("keyup", (event) => {
  if (["Space", "ArrowUp"].includes(event.code)) releaseJump();
  if (event.code === "ArrowDown") setDuck(false);
});

syncScore();
draw();
requestAnimationFrame(loop);

const bgm = document.querySelector("#bgm");
function playBgm() {
  if (bgm.paused) bgm.play().catch(() => {});
}
document.addEventListener("click", playBgm, { once: true });
document.addEventListener("keydown", playBgm, { once: true });
