import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

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

  startReload() {
    if (this.reloadLeft > 0 || this.mag >= this.def.magSize || this.reserve <= 0) return false;
    this.reloadLeft = this.def.reload;
    return true;
  }

  fire() {
    if (this.cooldown > 0 || this.reloadLeft > 0 || this.mag <= 0) return false;
    this.mag -= 1;
    this.cooldown = 1 / this.def.fireRate;
    return true;
  }
}

function limb(size, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, size.y, size.z),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.15 }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createPivotLimb(size, color, pivotY) {
  const pivot = new THREE.Group();
  pivot.position.y = pivotY;

  const mesh = limb(size, color);
  mesh.position.y = -size.y * 0.5;
  pivot.add(mesh);

  return { pivot, mesh };
}

const TEAM_PALETTES = {
  alpha: { torso: '#3b74a5', arms: '#2c5a82' },
  beta: { torso: '#a94d47', arms: '#853835' },
};

export class BotCharacter {
  constructor(x, z, team = 'beta') {
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.group.userData.kind = 'bot';
    this.group.userData.team = team;
    this.team = team;

    this.speed = 2.2;
    this.hp = 100;
    this.attackCooldown = 0;
    this.verticalVelocity = 0;
    this.walkPhase = Math.random() * Math.PI * 2;

    const palette = TEAM_PALETTES[team] ?? TEAM_PALETTES.beta;

    const torso = limb({ x: 0.52, y: 0.72, z: 0.26 }, palette.torso);
    torso.position.y = 1.45;
    const head = limb({ x: 0.42, y: 0.42, z: 0.42 }, '#e7b99a');
    head.position.y = 2.02;

    const leftArm = createPivotLimb({ x: 0.16, y: 0.74, z: 0.16 }, palette.arms, 1.78);
    leftArm.pivot.position.x = -0.34;
    this.leftArm = leftArm.pivot;

    const rightArm = createPivotLimb({ x: 0.16, y: 0.74, z: 0.16 }, palette.arms, 1.78);
    rightArm.pivot.position.x = 0.34;
    this.rightArm = rightArm.pivot;

    const leftLeg = createPivotLimb({ x: 0.18, y: 0.72, z: 0.18 }, '#28313a', 1.1);
    leftLeg.pivot.position.x = -0.13;
    this.leftLeg = leftLeg.pivot;

    const rightLeg = createPivotLimb({ x: 0.18, y: 0.72, z: 0.18 }, '#28313a', 1.1);
    rightLeg.pivot.position.x = 0.13;
    this.rightLeg = rightLeg.pivot;

    this.gun = limb({ x: 0.1, y: 0.18, z: 0.54 }, '#212326');
    this.gun.position.set(0.48, 1.42, 0.2);
    this.gun.rotation.x = Math.PI * 0.5;

    this.group.add(torso, head, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg, this.gun);
  }

  get alive() {
    return this.hp > 0;
  }

  animateWalk(time, speedFactor) {
    const sway = Math.sin(time * 8 + this.walkPhase) * 0.55 * speedFactor;
    this.leftLeg.rotation.x = sway;
    this.rightLeg.rotation.x = -sway;
    this.leftArm.rotation.x = -sway * 0.75;
    this.rightArm.rotation.x = sway * 0.75;
  }
}
