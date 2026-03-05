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

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function dist2d(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

export class Game {
  constructor(canvas, hud, mapSelection = 0) {
    this.canvas = canvas;
    this.hud = hud;
    this.map = Game.resolveMap(mapSelection);
    this.weaponIndex = 3;
    this.weapon = new WeaponState(WEAPONS[this.weaponIndex]);
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

    this.worldBlocks = [];
    this.wallBoxes = [];
    this.bots = [];
    this.raycaster = new THREE.Raycaster();

    this.buildWorld();
    this.buildPlayerModel();
    this.spawnPlayer();
    this.spawnBots();
    this.buildViewModel();
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
    const gunMat = new THREE.MeshStandardMaterial({ color: '#212428', metalness: 0.45, roughness: 0.45 });

    this.leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.18), sleeve);
    this.leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), skin);
    this.rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.18), sleeve);
    this.rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), skin);

    this.weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.95), gunMat);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.72), gunMat);
    barrel.position.set(0, 0.05, -0.75);
    this.weaponMesh.add(barrel);

    this.leftForearm.position.set(-0.34, -0.45, -0.55);
    this.leftForearm.rotation.x = -0.42;
    this.leftHand.position.set(-0.34, -0.69, -0.52);

    this.rightForearm.position.set(0.32, -0.44, -0.47);
    this.rightForearm.rotation.x = -0.5;
    this.rightHand.position.set(0.3, -0.68, -0.42);

    this.weaponMesh.position.set(0.18, -0.61, -0.72);

    this.viewModel.add(this.leftForearm, this.leftHand, this.rightForearm, this.rightHand, this.weaponMesh);
  }

  buildPlayerModel() {
    const skin = new THREE.MeshStandardMaterial({ color: '#e6b391', roughness: 0.7 });
    const shirt = new THREE.MeshStandardMaterial({ color: '#2c4b67', roughness: 0.8 });
    const pants = new THREE.MeshStandardMaterial({ color: '#28313a', roughness: 0.82 });

    this.playerBody = new THREE.Group();

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.62, 0.28), shirt);
    torso.position.y = 1.42;
    this.playerHead = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), skin);
    this.playerHead.position.y = 1.93;

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.54, 0.16), shirt);
    leftArm.position.set(-0.36, 1.42, 0);
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.54, 0.16), shirt);
    rightArm.position.set(0.36, 1.42, 0);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.2), pants);
    leftLeg.position.set(-0.14, 0.8, 0);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.2), pants);
    rightLeg.position.set(0.14, 0.8, 0);

    this.playerBody.add(torso, this.playerHead, leftArm, rightArm, leftLeg, rightLeg);
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
      if (k === 'e') this.cycleWeapon(1);
      if (k === 'q') this.cycleWeapon(-1);
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

  cycleWeapon(dir) {
    this.weaponIndex = (this.weaponIndex + dir + WEAPONS.length) % WEAPONS.length;
    this.weapon = new WeaponState(WEAPONS[this.weaponIndex]);
  }

  update(dt) {
    this.roundTime = Math.max(0, this.roundTime - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 1.8);
    this.weapon.update(dt);

    this.updateLook();
    this.updateMovement(dt);
    if (this.isFiring) this.fireWeapon();

    this.updateBots(dt);
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
    const next = this.playerPos.clone().addScaledVector(velocity, speed * dt);
    this.tryMove(next.x, this.playerPos.z);
    this.tryMove(this.playerPos.x, next.z);

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

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.x += (Math.random() - 0.5) * this.weapon.def.spread;
    dir.y += (Math.random() - 0.5) * this.weapon.def.spread;
    dir.z += (Math.random() - 0.5) * this.weapon.def.spread;
    dir.normalize();

    this.raycaster.set(this.camera.getWorldPosition(new THREE.Vector3()), dir);
    this.raycaster.far = this.weapon.def.range;

    const targets = this.bots.filter((b) => b.alive && b.team !== this.team).map((b) => b.group);
    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length > 0) {
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
          this.applyDamage(target, 8);
          bot.attackCooldown = 0.5 + Math.random() * 0.55;
        }
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
    this.weaponMesh.position.z = -0.72 + recoil;
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
    this.weapon = new WeaponState(WEAPONS[this.weaponIndex]);
    this.spawnPlayer();
    for (const bot of this.bots) this.scene.remove(bot.group);
    this.spawnBots();
  }

  updateHud() {
    this.hud.weapon.textContent = `${this.weapon.def.name} (${this.weapon.def.era})`;
    this.hud.ammo.textContent = `${this.weapon.mag}/${this.weapon.reserve}`;
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
