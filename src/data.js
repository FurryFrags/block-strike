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

const MAP_PADDING = 3;

function offsetBox([x0, y0, x1, y1], by = MAP_PADDING) {
  return [x0 + by, y0 + by, x1 + by, y1 + by];
}

function offsetPoint(point, by = MAP_PADDING) {
  return { ...point, x: point.x + by, y: point.y + by };
}

function offsetRing(ring, by = MAP_PADDING) {
  return { ...ring, x0: ring.x0 + by, y0: ring.y0 + by, x1: ring.x1 + by, y1: ring.y1 + by };
}

function buildProps(width, height) {
  const props = [];
  for (let x = 6.5; x < width - 5; x += 9) {
    for (let y = 6.5; y < height - 5; y += 9) {
      props.push({ x, y, h: 0.8 + ((x + y) % 2) * 0.25 });
    }
  }
  return props;
}

function makeMap(id, name, width, height, rings, links, blockers, alphaSpawns, betaSpawns, playerSpawn, scoreLimit = 40) {
  const expandedWidth = width + MAP_PADDING * 2;
  const expandedHeight = height + MAP_PADDING * 2;
  const shiftedRings = rings.map((ring) => offsetRing(ring));
  const shiftedLinks = links.map((link) => offsetBox(link));
  const shiftedBlockers = blockers.map((blocker) => offsetBox(blocker));

  return {
    id,
    name,
    mode: 'TDM',
    scoreLimit,
    grid: createLoopArena(expandedWidth, expandedHeight, shiftedRings, shiftedLinks, shiftedBlockers),
    playerSpawn: offsetPoint(playerSpawn),
    teamSpawns: { alpha: alphaSpawns.map((spawn) => offsetPoint(spawn)), beta: betaSpawns.map((spawn) => offsetPoint(spawn)) },
    props: buildProps(expandedWidth, expandedHeight),
  };
}

export const MAPS = [
  makeMap(
    'field',
    'Field',
    34,
    24,
    [],
    [],
    [
      [15, 10, 17, 12],
      [8, 6, 9, 7],
      [24, 16, 25, 17],
    ],
    [
      { x: 4.5, y: 5.5 },
      { x: 5.5, y: 12.5 },
      { x: 4.5, y: 18.5 },
      { x: 8.5, y: 8.5 },
      { x: 8.5, y: 16.5 },
    ],
    [
      { x: 29.5, y: 5.5 },
      { x: 28.5, y: 12.5 },
      { x: 29.5, y: 18.5 },
      { x: 25.5, y: 8.5 },
      { x: 25.5, y: 16.5 },
    ],
    { x: 5.5, y: 12.5, dir: 0 },
  ),
  makeMap(
    'hills',
    'Hills',
    36,
    24,
    [],
    [],
    [
      [11, 7, 13, 8],
      [21, 14, 23, 15],
      [16, 10, 18, 12],
      [7, 15, 8, 17],
      [27, 6, 28, 8],
    ],
    [
      { x: 5.5, y: 6.5 },
      { x: 5.5, y: 12.5 },
      { x: 5.5, y: 18.5 },
      { x: 9.5, y: 9.5 },
      { x: 9.5, y: 15.5 },
    ],
    [
      { x: 30.5, y: 6.5 },
      { x: 30.5, y: 12.5 },
      { x: 30.5, y: 18.5 },
      { x: 26.5, y: 9.5 },
      { x: 26.5, y: 15.5 },
    ],
    { x: 6.5, y: 12.5, dir: 0.04 },
  ),
  makeMap(
    'urban',
    'Urban',
    32,
    24,
    [],
    [],
    [
      [10, 5, 11, 8],
      [20, 5, 21, 8],
      [15, 11, 16, 14],
      [8, 16, 10, 17],
      [21, 16, 23, 17],
    ],
    [
      { x: 4.5, y: 6.5 },
      { x: 4.5, y: 12.5 },
      { x: 4.5, y: 18.5 },
      { x: 8.5, y: 10.5 },
      { x: 8.5, y: 14.5 },
    ],
    [
      { x: 27.5, y: 6.5 },
      { x: 27.5, y: 12.5 },
      { x: 27.5, y: 18.5 },
      { x: 23.5, y: 10.5 },
      { x: 23.5, y: 14.5 },
    ],
    { x: 5.5, y: 12.5, dir: 0.06 },
  ),
  makeMap(
    'base',
    'Base',
    34,
    24,
    [],
    [],
    [
      [13, 8, 14, 15],
      [19, 8, 20, 15],
      [15, 11, 18, 12],
      [7, 11, 8, 12],
      [25, 11, 26, 12],
    ],
    [
      { x: 5.5, y: 7.5 },
      { x: 5.5, y: 12.5 },
      { x: 5.5, y: 17.5 },
      { x: 9.5, y: 9.5 },
      { x: 9.5, y: 15.5 },
    ],
    [
      { x: 28.5, y: 7.5 },
      { x: 28.5, y: 12.5 },
      { x: 28.5, y: 17.5 },
      { x: 24.5, y: 9.5 },
      { x: 24.5, y: 15.5 },
    ],
    { x: 6.5, y: 12.5, dir: 0.03 },
  ),
  makeMap(
    'meltdown',
    'Meltdown',
    36,
    26,
    [],
    [],
    [
      [16, 11, 19, 14],
      [9, 9, 10, 10],
      [25, 15, 26, 16],
      [7, 18, 8, 19],
      [27, 6, 28, 7],
    ],
    [
      { x: 5.5, y: 7.5 },
      { x: 5.5, y: 13.5 },
      { x: 5.5, y: 19.5 },
      { x: 10.5, y: 10.5 },
      { x: 10.5, y: 16.5 },
    ],
    [
      { x: 30.5, y: 7.5 },
      { x: 30.5, y: 13.5 },
      { x: 30.5, y: 19.5 },
      { x: 25.5, y: 10.5 },
      { x: 25.5, y: 16.5 },
    ],
    { x: 6.5, y: 13.5, dir: 0.02 },
  ),
];

export function wallAt(map, x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (iy < 0 || iy >= map.grid.length || ix < 0 || ix >= map.grid[0].length) return '1';
  return map.grid[iy][ix];
}
