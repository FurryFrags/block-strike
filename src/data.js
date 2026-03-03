export const WEAPONS = [
  { id: 'thompson', era: 'WW2', name: 'Thompson M1A1', damage: 19, fireRate: 9.2, magSize: 30, reserve: 150, reload: 2.3, spread: 0.02, range: 45 },
  { id: 'mp40', era: 'WW2', name: 'MP40', damage: 21, fireRate: 8.1, magSize: 32, reserve: 160, reload: 2.5, spread: 0.018, range: 44 },
  { id: 'ak47', era: 'Cold War', name: 'AK-47', damage: 33, fireRate: 6.2, magSize: 30, reserve: 120, reload: 2.7, spread: 0.012, range: 60 },
  { id: 'm4', era: 'Modern', name: 'M4A1', damage: 28, fireRate: 8.5, magSize: 30, reserve: 150, reload: 2.2, spread: 0.01, range: 62 },
  { id: 'scar', era: 'Modern', name: 'SCAR-H', damage: 36, fireRate: 5.4, magSize: 20, reserve: 100, reload: 2.4, spread: 0.009, range: 65 },
  { id: 'vector', era: 'Modern', name: 'Vector .45', damage: 20, fireRate: 12.5, magSize: 25, reserve: 175, reload: 2.0, spread: 0.016, range: 40 },
];

function createLoopArena(width, height, rings = [], links = [], blockers = []) {
  const grid = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? '1' : '0')));

  const carveRing = ({ x0, y0, x1, y1, thickness = 1 }) => {
    for (let t = 0; t < thickness; t += 1) {
      const minX = x0 + t;
      const maxX = x1 - t;
      const minY = y0 + t;
      const maxY = y1 - t;
      for (let x = minX; x <= maxX; x += 1) {
        grid[minY][x] = '1';
        grid[maxY][x] = '1';
      }
      for (let y = minY; y <= maxY; y += 1) {
        grid[y][minX] = '1';
        grid[y][maxX] = '1';
      }
    }
  };

  for (const ring of rings) carveRing(ring);

  for (const link of links) {
    const [x0, y0, x1, y1] = link;
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) grid[y][x] = '0';
    }
  }

  for (const blocker of blockers) {
    const [x0, y0, x1, y1] = blocker;
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) grid[y][x] = '1';
    }
  }

  return grid.map((row) => row.join(''));
}

function buildProps(width, height) {
  const props = [];
  for (let x = 4.5; x < width - 3; x += 5) {
    for (let y = 4.5; y < height - 3; y += 5) {
      props.push({ x, y, h: 0.8 + ((x + y) % 3) * 0.2 });
    }
  }
  return props;
}

function makeMap(id, name, width, height, rings, links, blockers, alphaSpawns, betaSpawns, playerSpawn, scoreLimit = 40) {
  return {
    id,
    name,
    mode: 'TDM',
    scoreLimit,
    grid: createLoopArena(width, height, rings, links, blockers),
    playerSpawn,
    teamSpawns: { alpha: alphaSpawns, beta: betaSpawns },
    props: buildProps(width, height),
  };
}

export const MAPS = [
  makeMap(
    'loop-yard',
    'Loop Yard',
    32,
    24,
    [
      { x0: 3, y0: 3, x1: 28, y1: 20 },
      { x0: 7, y0: 6, x1: 24, y1: 17 },
      { x0: 11, y0: 9, x1: 20, y1: 14 },
    ],
    [
      [15, 3, 16, 6],
      [15, 17, 16, 20],
      [3, 11, 7, 12],
      [24, 11, 28, 12],
      [11, 11, 20, 12],
      [7, 8, 8, 15],
      [23, 8, 24, 15],
    ],
    [
      [4, 4, 5, 5],
      [26, 18, 27, 19],
      [14, 10, 17, 13],
    ],
    [
      { x: 6.5, y: 5.5 },
      { x: 5.5, y: 18.5 },
      { x: 9.5, y: 11.5 },
      { x: 12.5, y: 7.5 },
      { x: 12.5, y: 16.5 },
    ],
    [
      { x: 26.5, y: 5.5 },
      { x: 25.5, y: 18.5 },
      { x: 22.5, y: 11.5 },
      { x: 19.5, y: 7.5 },
      { x: 19.5, y: 16.5 },
    ],
    { x: 6.5, y: 12.5, dir: 0 },
  ),
  makeMap(
    'orbital-rings',
    'Orbital Rings',
    34,
    26,
    [
      { x0: 2, y0: 2, x1: 31, y1: 23 },
      { x0: 6, y0: 5, x1: 27, y1: 20 },
      { x0: 10, y0: 8, x1: 23, y1: 17 },
    ],
    [
      [16, 2, 17, 5],
      [16, 20, 17, 23],
      [2, 12, 6, 13],
      [27, 12, 31, 13],
      [10, 12, 23, 13],
      [13, 8, 14, 17],
      [19, 8, 20, 17],
    ],
    [
      [8, 6, 9, 7],
      [24, 18, 25, 19],
      [15, 11, 18, 14],
    ],
    [
      { x: 4.5, y: 6.5 },
      { x: 4.5, y: 19.5 },
      { x: 8.5, y: 12.5 },
      { x: 12.5, y: 9.5 },
      { x: 12.5, y: 16.5 },
    ],
    [
      { x: 29.5, y: 6.5 },
      { x: 29.5, y: 19.5 },
      { x: 25.5, y: 12.5 },
      { x: 21.5, y: 9.5 },
      { x: 21.5, y: 16.5 },
    ],
    { x: 5.5, y: 12.5, dir: 0.08 },
  ),
  makeMap(
    'switchback-core',
    'Switchback Core',
    30,
    22,
    [
      { x0: 2, y0: 2, x1: 27, y1: 19 },
      { x0: 6, y0: 5, x1: 23, y1: 16 },
      { x0: 10, y0: 8, x1: 19, y1: 13 },
    ],
    [
      [14, 2, 15, 5],
      [14, 16, 15, 19],
      [2, 10, 6, 11],
      [23, 10, 27, 11],
      [10, 10, 19, 11],
      [6, 6, 7, 15],
      [22, 6, 23, 15],
      [9, 13, 20, 14],
    ],
    [
      [4, 4, 5, 5],
      [24, 16, 25, 17],
      [13, 9, 16, 12],
    ],
    [
      { x: 5.5, y: 6.5 },
      { x: 4.5, y: 16.5 },
      { x: 8.5, y: 10.5 },
      { x: 11.5, y: 7.5 },
      { x: 11.5, y: 14.5 },
    ],
    [
      { x: 25.5, y: 5.5 },
      { x: 24.5, y: 15.5 },
      { x: 21.5, y: 10.5 },
      { x: 18.5, y: 7.5 },
      { x: 18.5, y: 14.5 },
    ],
    { x: 5.5, y: 10.5, dir: 0.06 },
  ),
];

export function wallAt(map, x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (iy < 0 || iy >= map.grid.length || ix < 0 || ix >= map.grid[0].length) return '1';
  return map.grid[iy][ix];
}
