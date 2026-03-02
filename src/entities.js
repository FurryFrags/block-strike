export class WeaponState {
  constructor(def) {
    this.def = structuredClone(def);
    this.mag = def.magSize;
    this.reserve = def.reserve;
    this.cooldown = 0;
    this.reloading = 0;
  }

  tick(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const need = this.def.magSize - this.mag;
        const take = Math.min(need, this.reserve);
        this.mag += take;
        this.reserve -= take;
      }
    }
  }

  canShoot() { return this.cooldown <= 0 && this.reloading <= 0 && this.mag > 0; }
  shoot() {
    this.mag -= 1;
    this.cooldown = 1 / this.def.fireRate;
  }
  startReload() {
    if (this.reloading <= 0 && this.mag < this.def.magSize && this.reserve > 0) {
      this.reloading = this.def.reload;
    }
  }
}

export class Soldier {
  constructor(x, y, radius = 15) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.hp = 100;
    this.armor = 0;
    this.stamina = 100;
    this.speedBase = 220;
    this.dead = false;
    this.angle = 0;
  }

  applyDamage(raw) {
    let dmg = raw;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, raw * 0.55);
      this.armor -= absorbed;
      dmg -= absorbed * 0.7;
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.dead = this.hp <= 0;
  }
}

export const intersectsRect = (x, y, r, rect) =>
  x + r > rect.x && x - r < rect.x + rect.w && y + r > rect.y && y - r < rect.y + rect.h;

export function resolveCollision(entity, obstacles) {
  for (const o of obstacles) {
    if (!intersectsRect(entity.x, entity.y, entity.radius, o)) continue;
    const cx = Math.max(o.x, Math.min(entity.x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(entity.y, o.y + o.h));
    const dx = entity.x - cx;
    const dy = entity.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const overlap = entity.radius - dist;
    if (overlap > 0) {
      entity.x += (dx / dist) * overlap;
      entity.y += (dy / dist) * overlap;
    }
  }
}

export function rayIntersectsRect(x1, y1, x2, y2, rect) {
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rect.x, rect.x + rect.w - x1, y1 - rect.y, rect.y + rect.h - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
}
