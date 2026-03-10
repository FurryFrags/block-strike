import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { MAPS, WEAPONS, wallAt } from './data.js';
import { BotCharacter, WeaponState } from './entities.js';

const PLAYER_RADIUS = 0.28;
const PLAYER_GROUND_Y = -0.49;
const PLAYER_HEAD_Y = 1.93;
const PLAYER_JUMP_SPEED = 8.4;
const BOT_RADIUS = 0.3;
const GRAVITY = -22;
const BOT_GROUND_Y = -0.49;
const BOT_SPAWN_Y = BOT_GROUND_Y + 1.2;
const PERSPECTIVES = ['first-person', 'third-person-back', 'third-person-front'];
const MC_PIXEL = 0.065;
const MODEL = {
  torso: { x: MC_PIXEL * 8, y: MC_PIXEL * 12, z: MC_PIXEL * 4 },
  limb: { x: MC_PIXEL * 4, y: MC_PIXEL * 12, z: MC_PIXEL * 4 },
  head: MC_PIXEL * 8 * 0.95,
};

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function dist2d(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

function weaponById(id, fallbackSlot = 'primary') {
  return WEAPONS.find((weapon) => weapon.id === id)
    ?? WEAPONS.find((weapon) => weapon.slot === fallbackSlot)
    ?? WEAPONS[0];
}

function createWeaponModel(id, materialOverride) {
  const mat = materialOverride ?? new THREE.MeshStandardMaterial({ color: '#20242b', metalness: 0.5, roughness: 0.38 });
  const root = new THREE.Group();
  const part = (w, h, d, x, y, z, rotX = 0, rotY = 0, rotZ = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotX, rotY, rotZ);
    root.add(mesh);
  };

  if (id === 'dagger') {
    part(0.05, 0.08, 0.2, 0, -0.02, 0.2);
    part(0.03, 0.03, 0.7, 0, 0.02, -0.25);
    part(0.02, 0.04, 0.24, 0, 0.02, -0.68, -0.1);
    return root;
  }

  if (id === 'frag') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), mat);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), mat);
    pin.position.set(0, 0.14, 0);
    root.add(body, pin);
    return root;
  }

  const rifleCore = () => {
    part(0.18, 0.18, 0.92, 0, 0, -0.08);
    part(0.1, 0.08, 0.7, 0, 0.04, -0.82);
    part(0.12, 0.16, 0.34, 0, -0.02, 0.4);
    part(0.08, 0.22, 0.18, 0, -0.15, 0.1, -0.2);
  };

  const pistolCore = () => {
    part(0.12, 0.12, 0.48, 0, 0.02, -0.08);
    part(0.07, 0.16, 0.14, 0, -0.11, 0.07, -0.3);
    part(0.06, 0.06, 0.18, 0, 0.05, -0.44);
  };

  switch (id) {
    case 'ak47':
      rifleCore();
      part(0.07, 0.2, 0.22, 0, -0.18, -0.08, 0.35);
      part(0.06, 0.06, 0.32, 0, 0.03, -1.02);
      break;
    case 'scar':
      rifleCore();
      part(0.11, 0.12, 0.32, 0, 0.15, -0.1);
      part(0.06, 0.06, 0.34, 0, 0.03, -1.02);
      break;
    case 'vector':
      part(0.16, 0.2, 0.52, 0, 0.01, -0.02);
      part(0.09, 0.14, 0.16, 0, -0.12, 0.08);
      part(0.06, 0.08, 0.28, 0, 0.03, -0.45);
      part(0.06, 0.18, 0.12, 0, -0.12, -0.1);
      break;
    case 'thompson':
      rifleCore();
      part(0.1, 0.1, 0.22, 0, -0.16, -0.02);
      break;
    case 'mp40':
      part(0.16, 0.16, 0.72, 0, 0.01, -0.05);
      part(0.08, 0.2, 0.18, 0, -0.14, -0.08);
      part(0.06, 0.06, 0.26, 0, 0.03, -0.75);
      break;
    case '1911':
    case 'makarov':
    case 'glock':
      pistolCore();
      if (id === 'glock') part(0.07, 0.1, 0.2, 0, 0.1, -0.15);
      break;
    default:
      rifleCore();
  }

  return root;
}

const DEFAULT_VIEW_POSE = {
  leftForearm: { position: [-0.29, -0.45, -0.54], rotation: [-0.34, 0, 0] },
  leftHand: { position: [-0.22, -0.64, -0.74], rotation: [-0.08, -0.16, 0.12] },
  rightForearm: { position: [0.27, -0.42, -0.5], rotation: [-0.44, 0, 0] },
  rightHand: { position: [0.25, -0.62, -0.66], rotation: [0.02, 0.04, -0.1] },
  weapon: { position: [0.18, -0.59, -0.77], rotation: [-0.02, 0.04, -0.03] },
};

const WEAPON_HAND_POSES = {
  ak47: {
    leftHand: { position: [-0.17, -0.61, -0.86], rotation: [-0.14, -0.07, 0.18] },
    weapon: { position: [0.17, -0.6, -0.82], rotation: [-0.02, 0.03, -0.04] },
    world: { position: [0.02, 0.02, -0.24], rotation: [0.08, 0.04, 0], scale: 0.95 },
  },
  m4: {
    leftHand: { position: [-0.16, -0.61, -0.88], rotation: [-0.12, -0.08, 0.16] },
    weapon: { position: [0.16, -0.59, -0.84], rotation: [-0.01, 0.03, -0.03] },
    world: { position: [0.02, 0.02, -0.25], rotation: [0.06, 0.03, 0], scale: 0.94 },
  },
  scar: {
    leftHand: { position: [-0.18, -0.62, -0.88], rotation: [-0.14, -0.05, 0.2] },
    weapon: { position: [0.17, -0.6, -0.83], rotation: [-0.02, 0.03, -0.05] },
    world: { position: [0.02, 0.03, -0.25], rotation: [0.1, 0.04, 0], scale: 0.97 },
  },
  thompson: {
    leftHand: { position: [-0.16, -0.63, -0.84], rotation: [-0.16, -0.08, 0.14] },
    weapon: { position: [0.17, -0.61, -0.79], rotation: [-0.03, 0.04, -0.03] },
    world: { position: [0.02, 0.03, -0.22], rotation: [0.12, 0.05, 0], scale: 0.94 },
  },
  mp40: {
    leftHand: { position: [-0.16, -0.62, -0.82], rotation: [-0.15, -0.06, 0.14] },
    weapon: { position: [0.17, -0.6, -0.78], rotation: [-0.03, 0.04, -0.04] },
    world: { position: [0.02, 0.03, -0.22], rotation: [0.1, 0.04, 0], scale: 0.93 },
  },
  vector: {
    leftHand: { position: [-0.16, -0.62, -0.79], rotation: [-0.11, -0.11, 0.12] },
    weapon: { position: [0.18, -0.6, -0.75], rotation: [-0.03, 0.04, -0.03] },
    world: { position: [0.02, 0.04, -0.21], rotation: [0.08, 0.04, 0], scale: 0.9 },
  },
  1911: {
    leftForearm: { position: [-0.33, -0.49, -0.56], rotation: [-0.28, 0, -0.07] },
    leftHand: { position: [-0.3, -0.65, -0.65], rotation: [0.3, -0.5, 0.36] },
    rightHand: { position: [0.26, -0.63, -0.62], rotation: [0.1, 0.08, -0.16] },
    weapon: { position: [0.2, -0.61, -0.72], rotation: [-0.01, 0.03, -0.06] },
    world: { position: [0.01, 0.08, -0.18], rotation: [0.16, 0.04, 0], scale: 0.88 },
  },
  makarov: {
    leftForearm: { position: [-0.33, -0.49, -0.56], rotation: [-0.28, 0, -0.07] },
    leftHand: { position: [-0.3, -0.65, -0.65], rotation: [0.28, -0.48, 0.34] },
    rightHand: { position: [0.26, -0.63, -0.62], rotation: [0.09, 0.08, -0.15] },
    weapon: { position: [0.2, -0.61, -0.72], rotation: [-0.01, 0.04, -0.05] },
    world: { position: [0.01, 0.08, -0.18], rotation: [0.16, 0.04, 0], scale: 0.88 },
  },
  glock: {
    leftForearm: { position: [-0.33, -0.49, -0.56], rotation: [-0.28, 0, -0.08] },
    leftHand: { position: [-0.3, -0.66, -0.65], rotation: [0.3, -0.5, 0.35] },
    rightHand: { position: [0.26, -0.63, -0.62], rotation: [0.1, 0.08, -0.16] },
    weapon: { position: [0.2, -0.62, -0.73], rotation: [-0.01, 0.03, -0.06] },
    world: { position: [0.01, 0.08, -0.18], rotation: [0.16, 0.04, 0], scale: 0.89 },
  },
  dagger: {
    leftForearm: { position: [-0.4, -0.52, -0.6], rotation: [-0.2, 0, -0.2] },
    leftHand: { position: [-0.35, -0.67, -0.67], rotation: [0.1, -0.6, 0.62] },
    rightForearm: { position: [0.3, -0.45, -0.56], rotation: [-0.3, 0.1, 0.08] },
    rightHand: { position: [0.27, -0.64, -0.7], rotation: [0.36, 0.18, -0.2] },
    weapon: { position: [0.21, -0.63, -0.71], rotation: [-0.95, -0.36, 0.42] },
    world: { position: [0.04, -0.06, -0.22], rotation: [-0.45, 0.02, 0], scale: 0.9 },
  },
  frag: {
    leftForearm: { position: [-0.25, -0.42, -0.52], rotation: [-0.25, 0, 0.08] },
    leftHand: { position: [-0.22, -0.57, -0.62], rotation: [0.02, -0.2, 0.1] },
    rightForearm: { position: [0.29, -0.47, -0.52], rotation: [-0.52, 0.1, -0.08] },
    rightHand: { position: [0.24, -0.65, -0.63], rotation: [0.6, 0.06, -0.2] },
    weapon: { position: [0.2, -0.59, -0.7], rotation: [0.2, 0.02, -0.02] },
    world: { position: [0.03, 0.04, -0.18], rotation: [0.1, 0, 0], scale: 1 },
  },
};

function applyPose(target, pose) {
  if (!pose) return;
  if (pose.position) target.position.set(...pose.position);
  if (pose.rotation) target.rotation.set(...pose.rotation);
  if (pose.scale) target.scale.setScalar(pose.scale);
}

export class Game {
  constructor(canvas, hud, options = 0) {
    this.canvas = canvas;
    this.hud = hud;

    const config = typeof options === 'object' && options !== null ? options : { mapSelection: options };
    this.map = Game.resolveMap(config.mapSelection ?? 0);

    const loadout = config.loadout ?? {};
    this.weaponSlots = {
      primary: weaponById(loadout.primary, 'primary'),
      secondary: weaponById(loadout.secondary, 'secondary'),
      dagger: weaponById('dagger', 'melee'),
    };
    this.currentSlot = 'primary';
    this.weapon = new WeaponState(this.weaponSlots.primary);
    this.grenadeState = new WeaponState(weaponById('frag', 'grenade'));
    this.score = 0;
    this.hp = 100;
    this.roundTime = 240;
    this.team = 'alpha';
    this.teamScores = { alpha: 0, beta: 0 };
    this.scoreLimit = this.map.scoreLimit ?? 40;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#7cbbff');
    this.scene.fog = new THREE.Fog('#7cbbff', 16, 58);

    this.cameraRig = new THREE.Group();
    this.pitchPivot = new THREE.Group();
    this.camera = new THREE.PerspectiveCamera(75, (canvas.clientWidth || 1280) / (canvas.clientHeight || 720), 0.1, 220);
    this.pitchPivot.position.y = PLAYER_HEAD_Y;
    this.pitchPivot.add(this.camera);
    this.cameraRig.add(this.pitchPivot);
    this.scene.add(this.cameraRig);

    this.clock = new THREE.Clock();
    this.running = false;
    this.keys = new Set();
    this.mouse = { dx: 0, dy: 0 };
    this.isFiring = false;
    this.damageFlash = 0;
    this.perspectiveIndex = 0;
    this.playerVerticalVelocity = 0;
    this.isPlayerGrounded = true;
    this.playerMoveAmount = 0;
    this.playerIsRunning = false;
    this.playerFirePose = 0;
    this.playerWalkTime = Math.random() * Math.PI * 2;

    this.worldBlocks = [];
    this.wallBoxes = [];
    this.bots = [];
    this.tracers = [];
    this.raycaster = new THREE.Raycaster();

    this.buildWorld();
    this.buildPlayerModel();
    this.spawnPlayer();
    this.spawnBots();
    this.buildViewModel();
    this.syncWeaponModel();
    this.bind();
  }

  static resolveMap(mapSelection) {
    if (typeof mapSelection === 'number' && Number.isInteger(mapSelection) && MAPS[mapSelection]) {
      return MAPS[mapSelection];
    }

    if (typeof mapSelection === 'string') {
      const mapById = MAPS.find((m) => m.id === mapSelection);
      if (mapById) return mapById;
    }

    console.warn(`[Game] Invalid map selection "${mapSelection}". Falling back to MAPS[0].`);
    return MAPS[0];
  }

  buildWorld() {
    const hemi = new THREE.HemisphereLight('#d4ecff', '#2c3038', 0.9);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight('#fff4db', 1.1);
    sun.position.set(12, 30, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(sun);

    const floorGeo = new THREE.PlaneGeometry(this.map.grid[0].length, this.map.grid.length, this.map.grid[0].length, this.map.grid.length);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(
      floorGeo,
      new THREE.MeshStandardMaterial({ color: '#4f6d3f', roughness: 0.95, metalness: 0.02 }),
    );
    floor.position.set(this.map.grid[0].length / 2, 0, this.map.grid.length / 2);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(this.map.grid[0].length, this.map.grid.length),
      new THREE.MeshStandardMaterial({ color: '#a7b2bf', roughness: 0.7, metalness: 0.02, side: THREE.BackSide }),
    );
    ceiling.rotateX(Math.PI / 2);
    ceiling.position.set(this.map.grid[0].length / 2, 5, this.map.grid.length / 2);
    this.scene.add(ceiling);

    const wallGeo = new THREE.BoxGeometry(1, 2.2, 1);
    for (let z = 0; z < this.map.grid.length; z += 1) {
      for (let x = 0; x < this.map.grid[z].length; x += 1) {
        if (this.map.grid[z][x] !== '1') continue;
        const wall = new THREE.Mesh(
          wallGeo,
          new THREE.MeshStandardMaterial({ color: '#7d8692', roughness: 0.8, metalness: 0.05 }),
        );
        wall.position.set(x + 0.5, 1.1, z + 0.5);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);
        this.worldBlocks.push(wall);
        this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
      }
    }

    for (const p of this.map.props) {
      const prop = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, p.h, 0.9),
        new THREE.MeshStandardMaterial({ color: '#6d5d44', roughness: 0.75 }),
      );
      prop.position.set(p.x, p.h / 2, p.y);
      prop.castShadow = true;
      prop.receiveShadow = true;
      this.scene.add(prop);
      this.worldBlocks.push(prop);
      this.wallBoxes.push(new THREE.Box3().setFromObject(prop));
    }
  }

  spawnPlayer() {
    const safeSpawn = this.findSafeSpawn(this.map.playerSpawn);
    this.playerPos = new THREE.Vector3(safeSpawn.x, PLAYER_GROUND_Y, safeSpawn.y);
    this.playerVerticalVelocity = 0;
    this.isPlayerGrounded = true;
    this.cameraRig.position.copy(this.playerPos);
    this.cameraRig.rotation.y = this.map.playerSpawn.dir;
    this.pitchPivot.rotation.x = 0;
    this.updateCameraPerspective();
  }

  spawnBots() {
    const makeTeam = (team) => (this.map.teamSpawns?.[team] ?? []).map((s) => {
      const safe = this.findSafeSpawn(s);
      const bot = new BotCharacter(safe.x, safe.y, team);
      bot.group.position.y = BOT_SPAWN_Y;
      this.scene.add(bot.group);
      return bot;
    });

    this.bots = [...makeTeam('alpha'), ...makeTeam('beta')];
  }

  findSafeSpawn(spawn) {
    const checks = [[0, 0], [0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6], [0.6, 0.6], [-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6]];
    for (const [dx, dy] of checks) {
      const x = spawn.x + dx;
      const y = spawn.y + dy;
      if (wallAt(this.map, x, y) === '0' && this.positionHasClearance(x, y, PLAYER_RADIUS + 0.04)) return { x, y };
    }
    return { x: spawn.x, y: spawn.y };
  }

  buildViewModel() {
    this.viewModel = new THREE.Group();
    this.camera.add(this.viewModel);

    const skin = new THREE.MeshStandardMaterial({ color: '#e6b391', roughness: 0.65 });
    const sleeve = new THREE.MeshStandardMaterial({ color: '#2c4b67', roughness: 0.8 });

    this.leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.18), sleeve);
    this.leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), skin);
    this.rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.18), sleeve);
    this.rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), skin);

    this.weaponMesh = new THREE.Group();

    applyPose(this.leftForearm, DEFAULT_VIEW_POSE.leftForearm);
    applyPose(this.leftHand, DEFAULT_VIEW_POSE.leftHand);
    applyPose(this.rightForearm, DEFAULT_VIEW_POSE.rightForearm);
    applyPose(this.rightHand, DEFAULT_VIEW_POSE.rightHand);
    applyPose(this.weaponMesh, DEFAULT_VIEW_POSE.weapon);

    this.viewModel.add(this.leftForearm, this.leftHand, this.rightForearm, this.rightHand, this.weaponMesh);
  }

  syncWeaponModel() {
    const weaponId = this.weapon.def.id;
    const pose = WEAPON_HAND_POSES[weaponId] ?? {};

    applyPose(this.leftForearm, DEFAULT_VIEW_POSE.leftForearm);
    applyPose(this.leftHand, DEFAULT_VIEW_POSE.leftHand);
    applyPose(this.rightForearm, DEFAULT_VIEW_POSE.rightForearm);
    applyPose(this.rightHand, DEFAULT_VIEW_POSE.rightHand);
    applyPose(this.weaponMesh, DEFAULT_VIEW_POSE.weapon);

    applyPose(this.leftForearm, pose.leftForearm);
    applyPose(this.leftHand, pose.leftHand);
    applyPose(this.rightForearm, pose.rightForearm);
    applyPose(this.rightHand, pose.rightHand);
    applyPose(this.weaponMesh, pose.weapon);

    this.weaponMesh.clear();
    const model = createWeaponModel(weaponId);
    this.weaponMesh.add(model);

    if (this.playerWeaponMount) {
      this.playerWeaponMount.clear();
      const worldModel = createWeaponModel(weaponId, new THREE.MeshStandardMaterial({ color: '#1f2329', metalness: 0.45, roughness: 0.4 }));
      worldModel.scale.setScalar(0.95);
      worldModel.position.set(0.02, 0.07, -0.2);
      worldModel.rotation.set(0.15, 0.05, 0);
      applyPose(worldModel, pose.world);
      this.playerWeaponMount.add(worldModel);
    }
  }

  buildPlayerModel() {
    const skin = new THREE.MeshStandardMaterial({ color: '#e6b391', roughness: 0.7 });
    const shirt = new THREE.MeshStandardMaterial({ color: '#2c4b67', roughness: 0.8 });
    const pants = new THREE.MeshStandardMaterial({ color: '#28313a', roughness: 0.82 });

    this.playerBody = new THREE.Group();

    const createPivotLimb = (size, material, pivotY) => {
      const pivot = new THREE.Group();
      pivot.position.y = pivotY;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
      mesh.position.y = -size.y * 0.5;
      pivot.add(mesh);
      return pivot;
    };

    const torso = new THREE.Mesh(new THREE.BoxGeometry(MODEL.torso.x, MODEL.torso.y, MODEL.torso.z), shirt);
    torso.position.y = 1.45;
    this.playerHead = new THREE.Mesh(new THREE.BoxGeometry(MODEL.head, MODEL.head, MODEL.head), skin);
    this.playerHead.position.y = 2.07;

    this.playerLeftArm = createPivotLimb(MODEL.limb, shirt, 1.84);
    this.playerLeftArm.position.x = -0.39;
    this.playerRightArm = createPivotLimb(MODEL.limb, shirt, 1.84);
    this.playerRightArm.position.x = 0.39;

    this.playerWeaponMount = new THREE.Group();
    this.playerWeaponMount.position.set(0.04, -0.21, -0.34);
    this.playerWeaponMount.rotation.set(0.04, 0.02, -0.08);
    this.playerRightArm.add(this.playerWeaponMount);

    this.playerLeftLeg = createPivotLimb(MODEL.limb, pants, 1.1);
    this.playerLeftLeg.position.x = -0.13;
    this.playerRightLeg = createPivotLimb(MODEL.limb, pants, 1.1);
    this.playerRightLeg.position.x = 0.13;

    this.playerBody.add(
      torso,
      this.playerHead,
      this.playerLeftArm,
      this.playerRightArm,
      this.playerLeftLeg,
      this.playerRightLeg,
    );
    this.cameraRig.add(this.playerBody);
  }

  get perspectiveName() {
    return PERSPECTIVES[this.perspectiveIndex];
  }

  cyclePerspective() {
    this.perspectiveIndex = (this.perspectiveIndex + 1) % PERSPECTIVES.length;
    this.updateCameraPerspective();
  }

  updateCameraPerspective() {
    if (this.perspectiveName === 'first-person') {
      this.camera.position.set(0, 0, 0);
      this.camera.rotation.set(0, 0, 0);
      if (this.viewModel) this.viewModel.visible = true;
      this.playerBody.visible = false;
      return;
    }

    const isFront = this.perspectiveName === 'third-person-front';
    this.camera.position.set(0, 0.35, isFront ? -3.2 : 3.2);
    this.camera.rotation.set(0, isFront ? Math.PI : 0, 0);
    if (this.viewModel) this.viewModel.visible = false;
    this.playerBody.visible = true;
    this.playerHead.visible = true;
  }

  bind() {
    this.onResize = () => {
      const width = this.canvas.clientWidth || window.innerWidth;
      const height = this.canvas.clientHeight || window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    };

    this.onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (e.code === 'Space') e.preventDefault();
      if (k === 'r') this.weapon.startReload();
      if (k === '1') this.selectWeaponSlot('primary');
      if (k === '2') this.selectWeaponSlot('secondary');
      if (k === '3') this.selectWeaponSlot('dagger');
      if (k === 'q') this.throwGrenade();
      if (k === 'p') this.cyclePerspective();
      if (k === 'escape') document.exitPointerLock();
    };

    this.onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    this.onMouseMove = (e) => {
      if (document.pointerLockElement !== this.canvas) return;
      this.mouse.dx += e.movementX;
      this.mouse.dy += e.movementY;
    };

    this.onMouseDown = () => {
      this.isFiring = true;
      if (document.pointerLockElement !== this.canvas) this.canvas.requestPointerLock();
    };

    this.onMouseUp = () => {
      this.isFiring = false;
    };

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    this.onResize();
  }

  start() {
    this.running = true;
    this.clock.start();
    this.loop();
  }

  stop() {
    this.running = false;
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
  }

  loop = () => {
    if (!this.running) return;
    const dt = clamp(this.clock.getDelta(), 0.001, 0.033);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  };

  selectWeaponSlot(slot) {
    const weaponDef = this.weaponSlots[slot];
    if (!weaponDef || this.currentSlot === slot) return;
    this.currentSlot = slot;
    this.weapon = new WeaponState(weaponDef);
    this.syncWeaponModel();
  }

  throwGrenade() {
    if (!this.grenadeState.fire()) return;

    for (const bot of this.bots) {
      if (!bot.alive || bot.team === this.team) continue;
      const d = dist2d(this.playerPos.x, this.playerPos.z, bot.group.position.x, bot.group.position.z);
      if (d <= this.grenadeState.def.splash) {
        bot.hp = Math.max(0, bot.hp - this.grenadeState.def.damage);
        if (!bot.alive) {
          this.teamScores.alpha += 1;
          bot.group.visible = false;
          this.respawnBot(bot);
        }
      }
    }
  }

  update(dt) {
    this.roundTime = Math.max(0, this.roundTime - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 1.8);
    this.weapon.update(dt);
    this.grenadeState.update(dt);
    this.playerFirePose = Math.max(0, this.playerFirePose - dt);

    this.updateLook();
    this.updateMovement(dt);
    this.animatePlayerModel(dt);
    if (this.isFiring) this.fireWeapon();

    this.updateBots(dt);
    this.updateTracers(dt);
    this.animateViewModel();

    if (this.hp <= 0 || this.roundTime <= 0 || this.teamScores.alpha >= this.scoreLimit || this.teamScores.beta >= this.scoreLimit) this.resetRound();
    this.updateHud();
  }

  updateLook() {
    this.cameraRig.rotation.y -= this.mouse.dx * 0.0021;
    this.pitchPivot.rotation.x = clamp(this.pitchPivot.rotation.x - this.mouse.dy * 0.0017, -1.2, 1.2);
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }

  updateMovement(dt) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.cameraRig.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.cameraRig.quaternion);
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    const velocity = new THREE.Vector3();
    if (this.keys.has('w')) velocity.add(forward);
    if (this.keys.has('s')) velocity.sub(forward);
    if (this.keys.has('d')) velocity.add(right);
    if (this.keys.has('a')) velocity.sub(right);

    if (velocity.lengthSq() > 0) velocity.normalize();

    const speed = 4.4 * (this.keys.has('shift') ? 1.5 : 1);
    const prevX = this.playerPos.x;
    const prevZ = this.playerPos.z;
    const next = this.playerPos.clone().addScaledVector(velocity, speed * dt);
    this.tryMove(next.x, this.playerPos.z);
    this.tryMove(this.playerPos.x, next.z);
    const movedDist = Math.hypot(this.playerPos.x - prevX, this.playerPos.z - prevZ);
    this.playerMoveAmount = clamp(movedDist / Math.max(dt * 6.4, 0.0001), 0, 1);
    this.playerIsRunning = this.keys.has('shift') && this.playerMoveAmount > 0.1;

    const isJumpPressed = this.keys.has(' ');
    if (isJumpPressed && this.isPlayerGrounded) {
      this.playerVerticalVelocity = PLAYER_JUMP_SPEED;
      this.isPlayerGrounded = false;
    }

    this.playerVerticalVelocity += GRAVITY * dt;
    this.playerPos.y += this.playerVerticalVelocity * dt;
    if (this.playerPos.y <= PLAYER_GROUND_Y) {
      this.playerPos.y = PLAYER_GROUND_Y;
      this.playerVerticalVelocity = 0;
      this.isPlayerGrounded = true;
    }

    this.cameraRig.position.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);
  }

  animatePlayerModel(dt) {
    this.playerWalkTime += dt * (this.playerIsRunning ? 12 : 8);
    const walkStrength = this.playerMoveAmount;
    const sway = Math.sin(this.playerWalkTime) * 0.55 * walkStrength;

    this.playerLeftLeg.rotation.x = sway;
    this.playerRightLeg.rotation.x = -sway;
    this.playerLeftArm.rotation.x = 0.16 - sway * 0.45;
    this.playerLeftArm.rotation.z = 0;
    const fireLift = this.playerFirePose > 0 ? Math.min(1, this.playerFirePose / 0.18) : 0;
    this.playerRightArm.rotation.x = 0.42 + sway * 0.25 + fireLift * 1.2;
    this.playerLeftArm.rotation.x += fireLift * 0.36;
    this.playerRightArm.rotation.z = 0;

    const headYawOffset = this.perspectiveName === 'third-person-front' ? Math.PI : 0;
    const headYaw = headYawOffset;
    const pitchSign = this.perspectiveName === 'third-person-front' ? -1 : 1;
    this.playerHead.rotation.y = headYaw;
    this.playerHead.rotation.x = clamp(this.pitchPivot.rotation.x * pitchSign, -0.8, 0.8);
  }

  tryMove(nx, nz) {
    if (wallAt(this.map, nx, nz) !== '0') return;
    if (!this.positionHasClearance(nx, nz, PLAYER_RADIUS + 0.02)) return;
    this.playerPos.x = nx;
    this.playerPos.z = nz;
  }

  positionHasClearance(x, z, radius) {
    for (const box of this.wallBoxes) {
      const nearestX = clamp(x, box.min.x, box.max.x);
      const nearestZ = clamp(z, box.min.z, box.max.z);
      if (Math.hypot(x - nearestX, z - nearestZ) < radius) return false;
    }
    return true;
  }

  fireWeapon() {
    if (!this.weapon.fire()) return;
    this.playerFirePose = 0.18;

    if (this.weapon.def.isMelee) {
      let closest = null;
      let closestDist = Infinity;
      for (const bot of this.bots) {
        if (!bot.alive || bot.team === this.team) continue;
        const d = dist2d(this.playerPos.x, this.playerPos.z, bot.group.position.x, bot.group.position.z);
        if (d < this.weapon.def.range && d < closestDist) {
          closest = bot;
          closestDist = d;
        }
      }
      if (closest) {
        closest.hp = Math.max(0, closest.hp - this.weapon.def.damage);
        if (!closest.alive) {
          this.score += 1;
          this.teamScores.alpha += 1;
          closest.group.visible = false;
          this.respawnBot(closest);
        }
      }
      return;
    }

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.x += (Math.random() - 0.5) * this.weapon.def.spread;
    dir.y += (Math.random() - 0.5) * this.weapon.def.spread;
    dir.z += (Math.random() - 0.5) * this.weapon.def.spread;
    dir.normalize();

    const shotOrigin = this.camera.getWorldPosition(new THREE.Vector3());
    this.raycaster.set(shotOrigin, dir);
    this.raycaster.far = this.weapon.def.range;

    const targets = this.bots.filter((b) => b.alive && b.team !== this.team).map((b) => b.group);
    const hits = this.raycaster.intersectObjects(targets, true);
    const shotEnd = shotOrigin.clone().addScaledVector(dir, this.weapon.def.range);
    if (hits.length > 0) {
      shotEnd.copy(hits[0].point);
      const root = hits[0].object.parent;
      const bot = this.bots.find((b) => b.group === root || b.group.children.includes(root));
      if (bot) {
        bot.hp = Math.max(0, bot.hp - this.weapon.def.damage);
        if (!bot.alive) {
          this.score += 1;
          this.teamScores.alpha += 1;
          bot.group.visible = false;
          this.respawnBot(bot);
        }
      }
    }
    this.spawnTracer(shotOrigin, shotEnd, this.team === 'alpha' ? '#ffe7a8' : '#ffb9b2');
  }

  updateBots(dt) {
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      const botPos = bot.group.position;
      this.applyBotGravity(bot, dt);
      const target = this.getBotTarget(bot);
      if (!target) continue;
      const d = dist2d(botPos.x, botPos.z, target.x, target.z);
      bot.attackCooldown = Math.max(0, bot.attackCooldown - dt);
      bot.firePose = Math.max(0, (bot.firePose ?? 0) - dt);

      if (d < 24) {
        const targetAngle = Math.atan2(target.x - botPos.x, target.z - botPos.z);
        bot.group.rotation.y = targetAngle;

        const moveStep = clamp(d - 1.8, 0, bot.speed * dt);
        const nx = botPos.x + Math.sin(targetAngle) * moveStep;
        const nz = botPos.z + Math.cos(targetAngle) * moveStep;
        if (wallAt(this.map, nx, nz) === '0' && this.positionHasClearance(nx, nz, BOT_RADIUS)) {
          botPos.x = nx;
          botPos.z = nz;
        }
        bot.animateWalk(performance.now() * 0.001, moveStep > 0 ? 1 : 0.2);

        if (d < 9 && bot.attackCooldown === 0 && this.canSeeTarget(botPos, target)) {
          const muzzleOrigin = bot.gunMuzzle
            ? bot.gunMuzzle.getWorldPosition(new THREE.Vector3())
            : new THREE.Vector3(botPos.x, 1.35, botPos.z);
          const targetPoint = target.type === 'player'
            ? new THREE.Vector3(target.x, this.playerPos.y + PLAYER_HEAD_Y - 0.15, target.z)
            : new THREE.Vector3(target.x, 1.45, target.z);
          this.spawnTracer(muzzleOrigin, targetPoint, bot.team === 'alpha' ? '#b8d9ff' : '#ffb8b8');
          this.applyDamage(target, 8);
          bot.attackCooldown = 0.5 + Math.random() * 0.55;
          bot.firePose = 0.18;
        }
      }
    }
  }


  spawnTracer(start, end, color = '#ffd592') {
    const delta = end.clone().sub(start);
    const length = delta.length();
    if (length <= 0.001) return;

    const tracer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, length, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
    );
    tracer.position.copy(start).addScaledVector(delta, 0.5);
    tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    this.scene.add(tracer);
    this.tracers.push({ mesh: tracer, life: 1.35, maxLife: 1.35 });
  }

  updateTracers(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
      const tracer = this.tracers[i];
      tracer.life -= dt;
      const alpha = clamp(tracer.life / tracer.maxLife, 0, 1);
      tracer.mesh.material.opacity = alpha * alpha * 0.9;
      if (tracer.life <= 0) {
        this.scene.remove(tracer.mesh);
        tracer.mesh.geometry.dispose();
        tracer.mesh.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }

  applyBotGravity(bot, dt) {
    bot.verticalVelocity += GRAVITY * dt;
    bot.group.position.y += bot.verticalVelocity * dt;
    if (bot.group.position.y <= BOT_GROUND_Y) {
      bot.group.position.y = BOT_GROUND_Y;
      bot.verticalVelocity = 0;
    }
  }

  getBotTarget(bot) {
    const opponents = [];
    if (bot.team !== this.team && this.hp > 0) {
      opponents.push({ type: 'player', x: this.playerPos.x, z: this.playerPos.z });
    }

    for (const other of this.bots) {
      if (!other.alive || other === bot || other.team === bot.team) continue;
      opponents.push({ type: 'bot', bot: other, x: other.group.position.x, z: other.group.position.z });
    }

    if (opponents.length === 0) return null;

    opponents.sort((a, b) => dist2d(bot.group.position.x, bot.group.position.z, a.x, a.z) - dist2d(bot.group.position.x, bot.group.position.z, b.x, b.z));
    return opponents[0];
  }

  applyDamage(target, damage) {
    if (target.type === 'player') {
      this.hp = Math.max(0, this.hp - damage);
      this.damageFlash = 1;
      return;
    }

    target.bot.hp = Math.max(0, target.bot.hp - damage);
    if (!target.bot.alive) {
      this.teamScores[target.bot.team === 'alpha' ? 'beta' : 'alpha'] += 1;
      target.bot.group.visible = false;
      this.respawnBot(target.bot);
    }
  }

  respawnBot(bot) {
    const candidates = this.map.teamSpawns?.[bot.team] ?? [];
    const spawn = candidates[Math.floor(Math.random() * candidates.length)] ?? this.map.playerSpawn;
    const safe = this.findSafeSpawn(spawn);
    bot.hp = 100;
    bot.verticalVelocity = 0;
    bot.group.position.set(safe.x, BOT_SPAWN_Y, safe.y);
    bot.group.visible = true;
  }

  canSeeTarget(botPos, target) {
    const targetY = target.type === 'player' ? this.playerPos.y + PLAYER_HEAD_Y : 1.4;
    const dir = new THREE.Vector3(target.x - botPos.x, targetY - 1.4, target.z - botPos.z).normalize();
    this.raycaster.set(new THREE.Vector3(botPos.x, 1.4, botPos.z), dir);
    this.raycaster.far = dist2d(botPos.x, botPos.z, target.x, target.z);
    const hits = this.raycaster.intersectObjects(this.worldBlocks, false);
    return hits.length === 0;
  }

  animateViewModel() {
    const recoil = (1 - this.weapon.cooldown * this.weapon.def.fireRate) * 0.08;
    const reloadTilt = this.weapon.reloadLeft > 0 ? 0.55 : 0;

    this.viewModel.position.y = -0.03 + recoil * 0.3;
    this.weaponMesh.position.z = -0.77 + recoil;
    this.weaponMesh.rotation.x = -reloadTilt;
    this.leftForearm.rotation.z = -reloadTilt * 0.25;
    this.rightForearm.rotation.z = reloadTilt * 0.25;

    this.canvas.style.boxShadow = this.damageFlash > 0 ? `inset 0 0 120px rgba(255,0,0,${this.damageFlash * 0.45})` : 'none';
  }

  resetRound() {
    this.hp = 100;
    this.score = 0;
    this.roundTime = 240;
    this.teamScores = { alpha: 0, beta: 0 };
    this.weapon = new WeaponState(this.weaponSlots[this.currentSlot]);
    this.grenadeState = new WeaponState(weaponById('frag', 'grenade'));
    this.syncWeaponModel();
    this.spawnPlayer();
    for (const bot of this.bots) this.scene.remove(bot.group);
    this.spawnBots();
  }

  updateHud() {
    this.hud.weapon.textContent = `${this.weapon.def.name} (${this.weapon.def.era})`;
    const ammoText = this.weapon.def.isMelee ? '∞' : `${this.weapon.mag}/${this.weapon.reserve}`;
    this.hud.ammo.textContent = `${ammoText} • G ${this.grenadeState.mag + this.grenadeState.reserve}`;
    this.hud.hp.textContent = String(Math.ceil(this.hp));
    this.hud.kills.textContent = `${this.teamScores.alpha}`;
    this.hud.enemies.textContent = `${this.teamScores.beta}`;
    const mins = String(Math.floor(this.roundTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.roundTime % 60)).padStart(2, '0');
    this.hud.timer.textContent = `${mins}:${secs}`;
    if (this.weapon.reloadLeft > 0) {
      this.hud.status.textContent = `Reloading ${this.weapon.reloadLeft.toFixed(1)}s`;
    } else {
      this.hud.status.textContent = `${this.map.name} • ${this.perspectiveName} • TDM ${this.teamScores.alpha}-${this.teamScores.beta} / ${this.scoreLimit}`;
    }
  }
}
