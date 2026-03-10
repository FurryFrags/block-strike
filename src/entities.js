import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

export class WeaponState {
  constructor(def) {
    this.def = def;
    this.mag = def.isMelee ? Infinity : def.magSize;
    this.reserve = def.isMelee ? Infinity : def.reserve;
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
    if (this.cooldown > 0 || this.reloadLeft > 0) return false;

    if (this.def.isMelee) {
      this.cooldown = 1 / this.def.fireRate;
      return true;
    }

    if (this.def.isGrenade) {
      if (this.mag + this.reserve <= 0) return false;
      if (this.mag <= 0 && this.reserve > 0) {
        this.mag = 1;
        this.reserve -= 1;
      }
      this.mag -= 1;
      this.cooldown = 1 / this.def.fireRate;
      return true;
    }

    if (this.mag <= 0) return false;
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

const MC_PIXEL = 0.065;
const MODEL = {
  torso: { x: MC_PIXEL * 8, y: MC_PIXEL * 12, z: MC_PIXEL * 4 },
  limb: { x: MC_PIXEL * 4, y: MC_PIXEL * 12, z: MC_PIXEL * 4 },
  head: MC_PIXEL * 8 * 0.95,
};

const TEAM_PALETTES = {
  alpha: { torso: '#3b74a5', arms: '#2c5a82' },
  beta: { torso: '#a94d47', arms: '#853835' },
};

const CHARACTER_POSE = {
  armRestX: 0.32,
  armRestZ: 0.08,
  supportArmX: -0.46,
  supportArmZ: -0.12,
  legStride: 0.7,
  weaponPitchMax: 0.85,
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
    this.firePose = 0;
    this.verticalVelocity = 0;
    this.walkPhase = Math.random() * Math.PI * 2;

    const palette = TEAM_PALETTES[team] ?? TEAM_PALETTES.beta;

    const torso = limb(MODEL.torso, palette.torso);
    torso.position.y = 1.45;
    const head = limb({ x: MODEL.head, y: MODEL.head, z: MODEL.head }, '#e7b99a');
    head.position.y = 2.07;

    const leftArm = createPivotLimb(MODEL.limb, palette.arms, 1.84);
    leftArm.pivot.position.x = -0.39;
    this.leftArm = leftArm.pivot;

    const rightArm = createPivotLimb(MODEL.limb, palette.arms, 1.84);
    rightArm.pivot.position.x = 0.39;
    this.rightArm = rightArm.pivot;

    const leftLeg = createPivotLimb(MODEL.limb, '#28313a', 1.1);
    leftLeg.pivot.position.x = -0.13;
    this.leftLeg = leftLeg.pivot;

    const rightLeg = createPivotLimb(MODEL.limb, '#28313a', 1.1);
    rightLeg.pivot.position.x = 0.13;
    this.rightLeg = rightLeg.pivot;

    this.gunMount = new THREE.Group();
    this.gunMount.position.set(0.02, -0.36, -0.31);
    this.gunMount.rotation.set(-0.02, 0.04, -0.02);

    this.gun = limb({ x: 0.1, y: 0.18, z: 0.54 }, '#212326');
    this.gun.position.set(0, -0.01, -0.12);
    this.gun.rotation.x = Math.PI * 0.5;

    this.gunMuzzle = new THREE.Object3D();
    this.gunMuzzle.position.set(0, 0, -0.45);

    this.gunMount.add(this.gun, this.gunMuzzle);
    this.rightArm.add(this.gunMount);

    this.group.add(torso, head, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
  }

  get alive() {
    return this.hp > 0;
  }

  animateWalk(time, speedFactor, aimPitch = 0) {
    const sway = Math.sin(time * 8 + this.walkPhase) * CHARACTER_POSE.legStride * speedFactor;
    this.leftLeg.rotation.x = sway;
    this.rightLeg.rotation.x = -sway;
    this.leftArm.rotation.x = CHARACTER_POSE.supportArmX - sway * 0.25;
    this.leftArm.rotation.z = CHARACTER_POSE.supportArmZ;
    const fireLift = this.firePose > 0 ? Math.min(1, this.firePose / 0.18) : 0;
    const clampedAimPitch = Math.max(-CHARACTER_POSE.weaponPitchMax, Math.min(CHARACTER_POSE.weaponPitchMax, aimPitch));
    this.rightArm.rotation.x = CHARACTER_POSE.armRestX + sway * 0.12 + fireLift * 0.28 - clampedAimPitch * 0.55;
    this.leftArm.rotation.x += fireLift * 0.2 - clampedAimPitch * 0.25;
    this.rightArm.rotation.z = CHARACTER_POSE.armRestZ;
  }
}
