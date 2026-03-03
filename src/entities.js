export class WeaponState {
  constructor(def) {
    this.def = def;
    this.mag = def.magSize;
    this.reserve = def.reserve;
    this.cooldown = 0;
    this.reloadLeft = 0;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloadLeft > 0) {
      this.reloadLeft = Math.max(0, this.reloadLeft - dt);
      if (this.reloadLeft === 0) {
        const needed = this.def.magSize - this.mag;
        const moved = Math.min(needed, this.reserve);
        this.mag += moved;
        this.reserve -= moved;
      }
    }
  }

  canFire() {
    return this.cooldown <= 0 && this.reloadLeft <= 0 && this.mag > 0;
  }

  startReload() {
    if (this.reloadLeft > 0 || this.mag === this.def.magSize || this.reserve <= 0) return false;
    this.reloadLeft = this.def.reload;
    return true;
  }

  fire() {
    if (!this.canFire()) return false;
    this.mag -= 1;
    this.cooldown = 1 / this.def.fireRate;
    return true;
  }
}

export class Actor {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 0.22;
    this.hp = 100;
    this.dir = 0;
    this.speed = 2.7;
  }

  get alive() {
    return this.hp > 0;
  }
}

export class Player extends Actor {
  constructor(x, y, dir, weaponDef) {
    super(x, y);
    this.dir = dir;
    this.pitch = 0;
    this.weapon = new WeaponState(weaponDef);
    this.score = 0;
  }
}

export class Bot extends Actor {
  constructor(x, y) {
    super(x, y);
    this.speed = 1.8;
    this.dir = Math.random() * Math.PI * 2;
    this.turnTimer = 0;
    this.attackCooldown = 0;
  }
}
