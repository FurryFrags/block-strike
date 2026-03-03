import { Game } from './game.js';
import { MAPS } from './data.js';

const hud = {
  hp: document.getElementById('hudHp'),
  weapon: document.getElementById('hudWeapon'),
  ammo: document.getElementById('hudAmmo'),
  kills: document.getElementById('hudKills'),
  enemies: document.getElementById('hudEnemies'),
  timer: document.getElementById('hudTimer'),
  status: document.getElementById('hudStatus'),
};

const menu = document.getElementById('menu');
const gameWrap = document.getElementById('gameWrap');
const canvas = document.getElementById('gameCanvas');
let game;
let selectedMapIndex = 0;

function startMatch() {
  menu.classList.add('hidden');
  gameWrap.classList.remove('hidden');

  const selectedMap = MAPS[selectedMapIndex % MAPS.length]?.id ?? 0;
  selectedMapIndex = (selectedMapIndex + 1) % MAPS.length;

  game = new Game(canvas, hud, selectedMap);
  game.start();
}

function leaveMatch() {
  game?.stop();
  gameWrap.classList.add('hidden');
  menu.classList.remove('hidden');
}

document.getElementById('playBtn').addEventListener('click', startMatch);
document.getElementById('exitBtn').addEventListener('click', leaveMatch);
