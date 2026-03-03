import { Soldier, WeaponState, resolveCollision, rayIntersectsRect } from './entities.js';

const WIDTH = 1366;
const HEIGHT = 768;
const ROUND_TIME = 120;
const MAX_ROUNDS = 16;

export class Game {
  constructor(canvas, hud, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hud = hud;
    this.map = config.map;
    this.loadout = config.loadout;
    this.score = { alpha: 0, bravo: 0 };
    this.round = 1;
    this.roundClock = ROUND_TIME;
    this.bullets = [];
    this.lastTime = 0;
    this.input = { keys: new Set(), mouseX: WIDTH / 2, mouseY: HEIGHT / 2, firing: false };

    this.setupRound();
    this.bindInput();
  }

  setupRound() {
    const p = new Soldier(this.map.playerSpawn.x, this.map.playerSpawn.y);
    p.armor = this.loadout.armor;
    p.speedBase *= this.loadout.mobility;
    p.weapons = [new WeaponState(this.loadout.primary), new WeaponState(this.loadout.secondary)];
    p.active = 0;
    this.player = p;

    this.enemies = this.map.enemySpawns.map((sp) => {
      const e = new Soldier(sp.x, sp.y, 14);
      e.armor = 30;
      e.speedBase = 180;
      e.weapon = new WeaponState({ name: 'AK-12', damage: 22, fireRate: 8, magSize: 30, reserve: 120, reload: 2.2, spread: 0.065, velocity: 980 });
      e.strafeSeed = Math.random() * Math.PI * 2;
      return e;
    });
    this.roundClock = ROUND_TIME;
    this.bullets.length = 0;
    this.updateHUD();
  }

  bindInput() {
    this.onKeyDown = (e) => {
      this.input.keys.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === 'r') this.currentWeapon().startReload();
      if (e.key.toLowerCase() === 'q') this.player.active = this.player.active ? 0 : 1;
      if (e.key === '1') this.player.active = 0;
      if (e.key === '2') this.player.active = 1;
    };
    this.onKeyUp = (e) => this.input.keys.delete(e.key.toLowerCase());
    this.onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.input.mouseX = (e.clientX - rect.left) * (WIDTH / rect.width);
      this.input.mouseY = (e.clientY - rect.top) * (HEIGHT / rect.height);
    };
    this.onMouseDown = () => { this.input.firing = true; };
    this.onMouseUp = () => { this.input.firing = false; };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
  }

  currentWeapon() { return this.player.weapons[this.player.active]; }

  tryShoot(shooter, targetX, targetY, weapon) {
    if (!weapon.canShoot()) return;
    weapon.shoot();
    const aim = Math.atan2(targetY - shooter.y, targetX - shooter.x);
    const spread = (Math.random() - 0.5) * weapon.def.spread;
    const angle = aim + spread;
    this.bullets.push({
      x: shooter.x,
      y: shooter.y,
      vx: Math.cos(angle) * weapon.def.velocity,
      vy: Math.sin(angle) * weapon.def.velocity,
      ttl: 1.2,
      damage: weapon.def.damage,
      team: shooter === this.player ? 'alpha' : 'bravo',
    });
  }

  update(dt) {
    this.roundClock = Math.max(0, this.roundClock - dt);
    if (this.roundClock <= 0) this.endRound('bravo', 'Time expired. Defenders win.');

    const p = this.player;
    const keys = this.input.keys;
    const sprint = keys.has('shift') && p.stamina > 1;
    const speed = p.speedBase * (sprint ? 1.55 : 1);
    const moveX = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
    const moveY = (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0);
    const len = Math.hypot(moveX, moveY) || 1;
    p.vx = (moveX / len) * speed;
    p.vy = (moveY / len) * speed;
    p.x = Math.max(p.radius, Math.min(WIDTH - p.radius, p.x + p.vx * dt));
    p.y = Math.max(p.radius, Math.min(HEIGHT - p.radius, p.y + p.vy * dt));
    resolveCollision(p, this.map.obstacles);
    p.angle = Math.atan2(this.input.mouseY - p.y, this.input.mouseX - p.x);

    p.stamina = sprint ? Math.max(0, p.stamina - 30 * dt) : Math.min(100, p.stamina + 24 * dt);

    const w = this.currentWeapon();
    w.tick(dt);
    if (this.input.firing) this.tryShoot(p, this.input.mouseX, this.input.mouseY, w);

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const strafe = Math.sin(performance.now() / 650 + enemy.strafeSeed) * 0.5;
      enemy.vx = (dx / dist) * enemy.speedBase + (-dy / dist) * enemy.speedBase * 0.28 * strafe;
      enemy.vy = (dy / dist) * enemy.speedBase + (dx / dist) * enemy.speedBase * 0.28 * strafe;
      if (dist < 240) {
        enemy.vx *= -0.3;
        enemy.vy *= -0.3;
      }
      enemy.x = Math.max(enemy.radius, Math.min(WIDTH - enemy.radius, enemy.x + enemy.vx * dt));
      enemy.y = Math.max(enemy.radius, Math.min(HEIGHT - enemy.radius, enemy.y + enemy.vy * dt));
      resolveCollision(enemy, this.map.obstacles);
      enemy.weapon.tick(dt);
      if (dist < 900) {
        let blocked = false;
        for (const o of this.map.obstacles) {
          if (rayIntersectsRect(enemy.x, enemy.y, p.x, p.y, o)) {
            blocked = true;
            break;
          }
        }
        if (!blocked) this.tryShoot(enemy, p.x, p.y, enemy.weapon);
      }
      if (enemy.weapon.mag === 0) enemy.weapon.startReload();
    }

    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.ttl -= dt;
      if (b.x < 0 || b.x > WIDTH || b.y < 0 || b.y > HEIGHT) b.ttl = 0;
      for (const o of this.map.obstacles) {
        if (b.x > o.x && b.x < o.x + o.w && b.y > o.y && b.y < o.y + o.h) b.ttl = 0;
      }
      const targets = b.team === 'alpha' ? this.enemies : [p];
      for (const t of targets) {
        if (t.dead) continue;
        if (Math.hypot(t.x - b.x, t.y - b.y) < t.radius) {
          t.applyDamage(b.damage);
          b.ttl = 0;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.ttl > 0);

    if (p.dead) this.endRound('bravo', 'You were eliminated.');
    if (this.enemies.every((e) => e.dead)) this.endRound('alpha', 'Enemy squad wiped out.');

    this.updateHUD();
  }

  endRound(winner, reason) {
    if (this.roundResolved) return;
    this.roundResolved = true;
    this.score[winner] += 1;
    this.hud.banner.textContent = `${winner.toUpperCase()} round won — ${reason}`;
    this.hud.banner.classList.remove('hidden');

    setTimeout(() => {
      this.hud.banner.classList.add('hidden');
      this.round += 1;
      if (this.round > MAX_ROUNDS || this.score.alpha >= 9 || this.score.bravo >= 9) {
        const champ = this.score.alpha > this.score.bravo ? 'Alpha Team' : 'Bravo Team';
        this.hud.banner.textContent = `${champ} wins the match (${this.score.alpha}-${this.score.bravo})`;
        this.hud.banner.classList.remove('hidden');
        setTimeout(() => {
          this.onExit?.();
        }, 2200);
      } else {
        this.roundResolved = false;
        this.setupRound();
      }
    }, 1800);
  }

  drawFloor(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.45);
    sky.addColorStop(0, '#1a2638');
    sky.addColorStop(1, this.map.palette.floor);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const horizonY = HEIGHT * 0.32;
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.12)';
    for (let y = horizonY; y < HEIGHT; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }
    for (let x = 0; x <= WIDTH; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, HEIGHT);
      ctx.lineTo(WIDTH / 2, horizonY);
      ctx.stroke();
    }
  }

  drawObstacle3D(ctx, o) {
    const depthX = 18;
    const depthY = 14;
    ctx.fillStyle = this.map.palette.wall;
    ctx.fillRect(o.x, o.y, o.w, o.h);

    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(o.x + depthX, o.y - depthY);
    ctx.lineTo(o.x + o.w + depthX, o.y - depthY);
    ctx.lineTo(o.x + o.w, o.y);
    ctx.closePath();
    ctx.fillStyle = this.map.palette.cover;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(o.x + o.w, o.y);
    ctx.lineTo(o.x + o.w + depthX, o.y - depthY);
    ctx.lineTo(o.x + o.w + depthX, o.y + o.h - depthY);
    ctx.lineTo(o.x + o.w, o.y + o.h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fill();
  }

  drawAgent(ctx, entity, baseColor) {
    const shadowW = entity.radius * 2.2;
    const shadowH = entity.radius * 1.05;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(entity.x + 6, entity.y + entity.radius * 0.65, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(
      entity.x - entity.radius * 0.4,
      entity.y - entity.radius * 0.6,
      entity.radius * 0.2,
      entity.x,
      entity.y,
      entity.radius * 1.2,
    );
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.14, baseColor);
    body.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  draw() {
    const ctx = this.ctx;
    const p = this.player;
    this.drawFloor(ctx);

    for (const o of this.map.obstacles) this.drawObstacle3D(ctx, o);

    ctx.strokeStyle = '#8bc2ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(this.input.mouseX, this.input.mouseY);
    ctx.stroke();
    ctx.lineWidth = 1;

    this.drawAgent(ctx, p, '#49c2ff');

    for (const e of this.enemies) {
      if (e.dead) continue;
      this.drawAgent(ctx, e, '#ff6868');
      ctx.fillStyle = '#121212';
      ctx.fillRect(e.x - 15, e.y - 24, 30, 5);
      ctx.fillStyle = '#7eff90';
      ctx.fillRect(e.x - 15, e.y - 24, (e.hp / 100) * 30, 5);
    }

    for (const b of this.bullets) {
      ctx.fillStyle = b.team === 'alpha' ? '#ffe7ad' : '#ffaeae';
      ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
      ctx.fillStyle = 'rgba(255, 213, 127, 0.3)';
      ctx.fillRect(b.x - 4, b.y - 4, 8, 8);
    }
  }

  updateHUD() {
    const p = this.player;
    const w = this.currentWeapon();
    this.hud.hp.textContent = Math.round(p.hp);
    this.hud.armor.textContent = Math.round(p.armor);
    this.hud.stamina.textContent = Math.round(p.stamina);
    this.hud.weapon.textContent = `${w.def.name}${w.reloading > 0 ? ' (Reloading)' : ''}`;
    this.hud.ammo.textContent = `${w.mag} / ${w.reserve}`;
    this.hud.round.textContent = `Round ${this.round} / ${MAX_ROUNDS}`;
    this.hud.score.textContent = `Alpha ${this.score.alpha} - ${this.score.bravo} Bravo`;
    const m = Math.floor(this.roundClock / 60).toString().padStart(2, '0');
    const s = Math.floor(this.roundClock % 60).toString().padStart(2, '0');
    this.hud.timer.textContent = `${m}:${s}`;
  }

  start() {
    const frame = (ts) => {
      if (!this.lastTime) this.lastTime = ts;
      const dt = Math.min(0.033, (ts - this.lastTime) / 1000);
      this.lastTime = ts;
      if (!this.stopped) {
        if (!this.roundResolved) this.update(dt);
        this.draw();
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  }

  stop() {
    this.stopped = true;
    this.destroy();
  }
}
