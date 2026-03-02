import { LOADOUTS, MAP_POOL } from './data.js';
import { Game } from './game.js';

const screens = {
  menu: document.getElementById('menuScreen'),
  loadout: document.getElementById('loadoutScreen'),
  maps: document.getElementById('mapsScreen'),
  help: document.getElementById('helpScreen'),
  game: document.getElementById('gameScreen'),
};

const state = {
  selectedLoadout: LOADOUTS[0],
  selectedMap: MAP_POOL[0],
  game: null,
};

const hud = {
  hp: document.getElementById('hudHp'),
  armor: document.getElementById('hudArmor'),
  stamina: document.getElementById('hudStamina'),
  weapon: document.getElementById('hudWeapon'),
  ammo: document.getElementById('hudAmmo'),
  round: document.getElementById('hudRound'),
  timer: document.getElementById('hudTimer'),
  score: document.getElementById('hudScore'),
  banner: document.getElementById('roundBanner'),
};

function show(screen) {
  Object.values(screens).forEach((el) => el.classList.remove('active'));
  screen.classList.add('active');
}

function buildLoadouts() {
  const container = document.getElementById('loadoutOptions');
  container.innerHTML = '';
  for (const loadout of LOADOUTS) {
    const card = document.createElement('button');
    card.className = `card ${state.selectedLoadout.id === loadout.id ? 'selected' : ''}`;
    card.innerHTML = `
      <h3>${loadout.name}</h3>
      <small>Primary: ${loadout.primary.name} (${loadout.primary.damage} dmg)</small><br/>
      <small>Secondary: ${loadout.secondary.name}</small><br/>
      <small>Armor: ${loadout.armor} | Mobility: ${loadout.mobility.toFixed(2)}x</small>
    `;
    card.addEventListener('click', () => {
      state.selectedLoadout = loadout;
      buildLoadouts();
    });
    container.appendChild(card);
  }
}

function buildMaps() {
  const container = document.getElementById('mapOptions');
  container.innerHTML = '';
  for (const map of MAP_POOL) {
    const card = document.createElement('button');
    card.className = `card ${state.selectedMap.id === map.id ? 'selected' : ''}`;
    card.innerHTML = `
      <h3>${map.name}</h3>
      <small>ID: ${map.id}</small><br/>
      <small>Enemy Spawns: ${map.enemySpawns.length}</small><br/>
      <small>Cover Objects: ${map.obstacles.length}</small>
    `;
    card.addEventListener('click', () => {
      state.selectedMap = map;
      buildMaps();
    });
    container.appendChild(card);
  }
}

function startGame() {
  show(screens.game);
  const canvas = document.getElementById('gameCanvas');
  state.game?.stop();
  const game = new Game(canvas, hud, { map: state.selectedMap, loadout: state.selectedLoadout });
  game.onExit = () => {
    game.stop();
    show(screens.menu);
  };
  state.game = game;
  game.start();
}

buildLoadouts();
buildMaps();

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('loadoutBtn').addEventListener('click', () => show(screens.loadout));
document.getElementById('mapsBtn').addEventListener('click', () => show(screens.maps));
document.getElementById('howToBtn').addEventListener('click', () => show(screens.help));
document.getElementById('saveLoadoutBtn').addEventListener('click', () => show(screens.menu));
document.getElementById('exitBtn').addEventListener('click', () => {
  state.game?.stop();
  show(screens.menu);
});

document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', () => show(screens.menu));
});
