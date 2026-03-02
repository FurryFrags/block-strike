export const LOADOUTS = [
  {
    id: 'assault',
    name: 'Rifleman Assault',
    primary: { name: 'M4A1', damage: 23, fireRate: 11, magSize: 30, reserve: 90, reload: 1.9, spread: 0.045, velocity: 1050 },
    secondary: { name: 'G17', damage: 18, fireRate: 6, magSize: 17, reserve: 51, reload: 1.3, spread: 0.06, velocity: 900 },
    armor: 60,
    mobility: 1,
  },
  {
    id: 'breacher',
    name: 'CQB Breacher',
    primary: { name: 'MP7', damage: 17, fireRate: 15, magSize: 40, reserve: 120, reload: 2.1, spread: 0.075, velocity: 880 },
    secondary: { name: 'P320', damage: 20, fireRate: 5, magSize: 15, reserve: 45, reload: 1.4, spread: 0.05, velocity: 910 },
    armor: 50,
    mobility: 1.15,
  },
  {
    id: 'marksman',
    name: 'Designated Marksman',
    primary: { name: 'MK11', damage: 58, fireRate: 2.8, magSize: 20, reserve: 60, reload: 2.6, spread: 0.018, velocity: 1200 },
    secondary: { name: 'USP Tactical', damage: 24, fireRate: 4, magSize: 12, reserve: 48, reload: 1.6, spread: 0.03, velocity: 950 },
    armor: 70,
    mobility: 0.9,
  },
  {
    id: 'support',
    name: 'Support Gunner',
    primary: { name: 'M249', damage: 25, fireRate: 12, magSize: 80, reserve: 160, reload: 4.2, spread: 0.08, velocity: 990 },
    secondary: { name: 'Five-Seven', damage: 19, fireRate: 6, magSize: 20, reserve: 60, reload: 1.6, spread: 0.06, velocity: 920 },
    armor: 80,
    mobility: 0.82,
  },
];

export const MAP_POOL = [
  {
    id: 'dockyard',
    name: 'Dockyard Siege',
    palette: { floor: '#161e2c', wall: '#38495f', cover: '#526f8e' },
    playerSpawn: { x: 160, y: 690 },
    enemySpawns: [{ x: 1200, y: 120 }, { x: 1110, y: 190 }, { x: 1240, y: 250 }, { x: 1000, y: 160 }],
    obstacles: [
      { x: 320, y: 560, w: 220, h: 56 }, { x: 690, y: 570, w: 180, h: 62 }, { x: 980, y: 530, w: 280, h: 50 },
      { x: 470, y: 350, w: 62, h: 220 }, { x: 820, y: 180, w: 230, h: 64 }, { x: 180, y: 180, w: 250, h: 64 },
      { x: 570, y: 80, w: 80, h: 190 }, { x: 1110, y: 350, w: 90, h: 230 },
    ],
  },
  {
    id: 'wasteland',
    name: 'Wasteland Compound',
    palette: { floor: '#2a2118', wall: '#6f5843', cover: '#8d6f53' },
    playerSpawn: { x: 140, y: 100 },
    enemySpawns: [{ x: 1240, y: 690 }, { x: 1040, y: 690 }, { x: 1230, y: 560 }, { x: 920, y: 600 }],
    obstacles: [
      { x: 280, y: 180, w: 220, h: 62 }, { x: 590, y: 140, w: 250, h: 75 }, { x: 940, y: 140, w: 280, h: 50 },
      { x: 240, y: 420, w: 100, h: 250 }, { x: 450, y: 330, w: 360, h: 70 }, { x: 880, y: 350, w: 130, h: 280 },
      { x: 1080, y: 480, w: 160, h: 70 },
    ],
  },
  {
    id: 'metro',
    name: 'Metro Interchange',
    palette: { floor: '#1f2328', wall: '#4f5964', cover: '#66717f' },
    playerSpawn: { x: 640, y: 700 },
    enemySpawns: [{ x: 190, y: 90 }, { x: 640, y: 90 }, { x: 1180, y: 100 }, { x: 300, y: 220 }],
    obstacles: [
      { x: 100, y: 250, w: 1160, h: 44 }, { x: 100, y: 520, w: 1160, h: 44 },
      { x: 260, y: 300, w: 72, h: 220 }, { x: 560, y: 300, w: 72, h: 220 }, { x: 860, y: 300, w: 72, h: 220 },
      { x: 1160, y: 300, w: 72, h: 220 },
    ],
  },
];
