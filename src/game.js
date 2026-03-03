import { MAPS, WEAPONS, wallAt } from './data.js';
import { Bot, Player } from './entities.js';

const FOV = Math.PI / 3;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export class Game {
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hud = hud;
    this.map = MAPS[0];
    this.weaponIndex = 3;
    this.player = new Player(this.map.playerSpawn.x, this.map.playerSpawn.y, this.map.playerSpawn.dir, WEAPONS[this.weaponIndex]);
    this.bots = this.map.botSpawns.map((s) => new Bot(s.x, s.y));
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.isFiring = false;
    this.last = 0;
    this.running = false;
    this.roundTime = 180;
    this.damageFlash = 0;
    this.bind();
  }

  bind() {
    this.onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k === 'r') this.player.weapon.startReload();
      if (k === 'e') this.cycleWeapon(1);
      if (k === 'q') this.cycleWeapon(-1);
      if (k === 'escape') document.exitPointerLock();
    };
    this.onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    this.onMouseMove = (e) => {
      if (document.pointerLockElement !== this.canvas) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    };
    this.onMouseDown = () => {
      this.isFiring = true;
      if (document.pointerLockElement !== this.canvas) this.canvas.requestPointerLock();
    };
    this.onMouseUp = () => {
      this.isFiring = false;
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  cycleWeapon(delta) {
    this.weaponIndex = (this.weaponIndex + delta + WEAPONS.length) % WEAPONS.length;
    this.player.weapon = new (this.player.weapon.constructor)(WEAPONS[this.weaponIndex]);
  }

  stop() {
    this.running = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
  }

  start() {
    this.running = true;
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(ts) {
    if (!this.running) return;
    const dt = clamp((ts - this.last) / 1000 || 0.016, 0, 0.034);
    this.last = ts;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.roundTime = Math.max(0, this.roundTime - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2);
    this.player.weapon.update(dt);

    const lookSpeed = 0.0022;
    this.player.dir += this.mouseDX * lookSpeed;
    this.player.pitch = clamp(this.player.pitch + this.mouseDY * 0.0012, -0.15, 0.15);
    this.mouseDX = 0;
    this.mouseDY = 0;

    const sprint = this.keys.has('shift') ? 1.55 : 1;
    const speed = this.player.speed * sprint;
    let dx = 0;
    let dy = 0;
    if (this.keys.has('w')) {
      dx += Math.cos(this.player.dir);
      dy += Math.sin(this.player.dir);
    }
    if (this.keys.has('s')) {
      dx -= Math.cos(this.player.dir);
      dy -= Math.sin(this.player.dir);
    }
    if (this.keys.has('a')) {
      dx += Math.cos(this.player.dir - Math.PI / 2);
      dy += Math.sin(this.player.dir - Math.PI / 2);
    }
    if (this.keys.has('d')) {
      dx += Math.cos(this.player.dir + Math.PI / 2);
      dy += Math.sin(this.player.dir + Math.PI / 2);
    }
    const len = Math.hypot(dx, dy) || 1;
    this.tryMove(this.player, (dx / len) * speed * dt, (dy / len) * speed * dt);

    if (this.isFiring) this.firePlayerWeapon();

    for (const bot of this.bots) {
      if (!bot.alive) continue;
      bot.attackCooldown = Math.max(0, bot.attackCooldown - dt);
      bot.turnTimer -= dt;

      const playerDist = dist(bot.x, bot.y, this.player.x, this.player.y);
      if (playerDist < 8) {
        bot.dir = Math.atan2(this.player.y - bot.y, this.player.x - bot.x);
        const step = Math.min(playerDist - 1.2, bot.speed * dt);
        if (step > 0) this.tryMove(bot, Math.cos(bot.dir) * step, Math.sin(bot.dir) * step);
        if (playerDist < 6 && bot.attackCooldown === 0 && this.hasLineOfSight(bot.x, bot.y, this.player.x, this.player.y)) {
          this.player.hp = Math.max(0, this.player.hp - 8);
          this.damageFlash = 1;
          bot.attackCooldown = 0.45 + Math.random() * 0.6;
        }
      } else {
        if (bot.turnTimer <= 0) {
          bot.turnTimer = 1 + Math.random() * 2;
          bot.dir += (Math.random() - 0.5) * 1.6;
        }
        this.tryMove(bot, Math.cos(bot.dir) * bot.speed * dt * 0.5, Math.sin(bot.dir) * bot.speed * dt * 0.5);
      }
    }

    if (this.player.hp === 0 || this.roundTime === 0 || this.bots.every((b) => !b.alive)) {
      this.resetRound();
    }

    this.updateHud();
  }

  resetRound() {
    this.player.hp = 100;
    this.player.x = this.map.playerSpawn.x;
    this.player.y = this.map.playerSpawn.y;
    this.player.dir = this.map.playerSpawn.dir;
    this.roundTime = 180;
    this.bots = this.map.botSpawns.map((s) => new Bot(s.x, s.y));
    this.player.weapon = new (this.player.weapon.constructor)(WEAPONS[this.weaponIndex]);
  }

  firePlayerWeapon() {
    const w = this.player.weapon;
    if (!w.fire()) return;

    const shotAngle = this.player.dir + (Math.random() - 0.5) * w.def.spread;
    let best = null;
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      const angle = Math.atan2(bot.y - this.player.y, bot.x - this.player.x);
      const d = dist(bot.x, bot.y, this.player.x, this.player.y);
      const angleDelta = Math.abs(Math.atan2(Math.sin(angle - shotAngle), Math.cos(angle - shotAngle)));
      const hitWindow = 0.08 + 0.16 / Math.max(1.4, d);
      if (angleDelta < hitWindow && d <= w.def.range && this.hasLineOfSight(this.player.x, this.player.y, bot.x, bot.y)) {
        if (!best || d < best.dist) best = { bot, dist: d };
      }
    }
    if (best) {
      best.bot.hp = Math.max(0, best.bot.hp - w.def.damage);
      if (!best.bot.alive) this.player.score += 1;
    }
  }

  hasLineOfSight(ax, ay, bx, by) {
    const step = 0.05;
    const total = dist(ax, ay, bx, by);
    const dx = (bx - ax) / total;
    const dy = (by - ay) / total;
    for (let t = 0; t < total; t += step) {
      if (wallAt(this.map, ax + dx * t, ay + dy * t) !== '0') return false;
    }
    return true;
  }

  tryMove(actor, dx, dy) {
    const nx = actor.x + dx;
    const ny = actor.y + dy;
    if (wallAt(this.map, nx, actor.y) === '0') actor.x = nx;
    if (wallAt(this.map, actor.x, ny) === '0') actor.y = ny;
  }

  castRay(angle) {
    const step = 0.015;
    let d = 0;
    while (d < 20) {
      const x = this.player.x + Math.cos(angle) * d;
      const y = this.player.y + Math.sin(angle) * d;
      if (wallAt(this.map, x, y) !== '0') return d;
      d += step;
    }
    return 20;
  }

  render() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#89b7ff';
    const skyShift = this.player.pitch * h;
    ctx.fillRect(0, 0, w, h / 2 + skyShift);
    ctx.fillStyle = '#3d3b34';
    ctx.fillRect(0, h / 2 + skyShift, w, h / 2 - skyShift);

    for (let x = 0; x < w; x++) {
      const rayAngle = this.player.dir - FOV / 2 + (x / w) * FOV;
      const d = this.castRay(rayAngle);
      const fixed = d * Math.cos(rayAngle - this.player.dir);
      const wallH = Math.min(h, (h / fixed) * 0.9);
      const y = h / 2 - wallH / 2 + skyShift;
      const shade = clamp(220 - fixed * 18, 50, 220);
      ctx.fillStyle = `rgb(${shade * 0.65}, ${shade * 0.8}, ${shade})`;
      ctx.fillRect(x, y, 1, wallH);
    }

    const sprites = this.bots
      .filter((b) => b.alive)
      .map((b) => {
        const dx = b.x - this.player.x;
        const dy = b.y - this.player.y;
        const d = Math.hypot(dx, dy);
        let angle = Math.atan2(dy, dx) - this.player.dir;
        angle = Math.atan2(Math.sin(angle), Math.cos(angle));
        return { b, d, angle };
      })
      .filter((s) => Math.abs(s.angle) < FOV / 1.7)
      .sort((a, b) => b.d - a.d);

    for (const s of sprites) {
      const sx = ((s.angle + FOV / 2) / FOV) * w;
      const size = clamp((h / s.d) * 0.75, 14, 260);
      const sy = h / 2 - size / 2 + skyShift;
      ctx.fillStyle = '#bc3e3e';
      ctx.fillRect(sx - size / 2, sy, size, size);
      ctx.fillStyle = '#2b1010';
      ctx.fillRect(sx - size * 0.12, sy + size * 0.2, size * 0.08, size * 0.08);
      ctx.fillRect(sx + size * 0.04, sy + size * 0.2, size * 0.08, size * 0.08);
    }

    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 8, h / 2);
    ctx.lineTo(w / 2 + 8, h / 2);
    ctx.moveTo(w / 2, h / 2 - 8);
    ctx.lineTo(w / 2, h / 2 + 8);
    ctx.stroke();

    const recoil = (1 - this.player.weapon.cooldown * this.player.weapon.def.fireRate) * 14;
    ctx.fillStyle = '#1f1f1f';
    ctx.fillRect(w * 0.68, h * 0.74 + recoil, w * 0.26, h * 0.22);
    ctx.fillStyle = '#454545';
    ctx.fillRect(w * 0.75, h * 0.8 + recoil, w * 0.18, h * 0.08);

    if (this.damageFlash > 0) {
      ctx.fillStyle = `rgba(255, 40, 40, ${this.damageFlash * 0.28})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  updateHud() {
    const aliveBots = this.bots.filter((b) => b.alive).length;
    this.hud.weapon.textContent = `${this.player.weapon.def.name} (${this.player.weapon.def.era})`;
    this.hud.ammo.textContent = `${this.player.weapon.mag}/${this.player.weapon.reserve}`;
    this.hud.hp.textContent = String(Math.ceil(this.player.hp));
    this.hud.kills.textContent = String(this.player.score);
    this.hud.enemies.textContent = String(aliveBots);
    const mins = String(Math.floor(this.roundTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.roundTime % 60)).padStart(2, '0');
    this.hud.timer.textContent = `${mins}:${secs}`;
    this.hud.status.textContent = this.player.weapon.reloadLeft > 0 ? `Reloading ${(this.player.weapon.reloadLeft).toFixed(1)}s` : 'Hot Zone';
  }
}
