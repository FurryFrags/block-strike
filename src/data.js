export const WEAPONS = [
  { id: 'thompson', era: 'WW2', name: 'Thompson M1A1', damage: 19, fireRate: 9.2, magSize: 30, reserve: 150, reload: 2.3, spread: 0.02, range: 45 },
  { id: 'mp40', era: 'WW2', name: 'MP40', damage: 21, fireRate: 8.1, magSize: 32, reserve: 160, reload: 2.5, spread: 0.018, range: 44 },
  { id: 'ak47', era: 'Cold War', name: 'AK-47', damage: 33, fireRate: 6.2, magSize: 30, reserve: 120, reload: 2.7, spread: 0.012, range: 60 },
  { id: 'm4', era: 'Modern', name: 'M4A1', damage: 28, fireRate: 8.5, magSize: 30, reserve: 150, reload: 2.2, spread: 0.01, range: 62 },
  { id: 'scar', era: 'Modern', name: 'SCAR-H', damage: 36, fireRate: 5.4, magSize: 20, reserve: 100, reload: 2.4, spread: 0.009, range: 65 },
  { id: 'vector', era: 'Modern', name: 'Vector .45', damage: 20, fireRate: 12.5, magSize: 25, reserve: 175, reload: 2.0, spread: 0.016, range: 40 },
];

export const MAPS = [
  {
    id: 'megasector',
    name: 'Mega Sector',
    grid: [
      '11111111111111111111',
      '10000000001000000001',
      '10111111101011111101',
      '10000000100010000101',
      '10111110111010110101',
      '10100010100010100101',
      '10101010101110101101',
      '10001000001000100001',
      '11101111101011101111',
      '10001000100010001001',
      '10111010111010111001',
      '10000010000010000001',
      '10111110111110111101',
      '10001000000000001001',
      '10101011111111101001',
      '10000000001000000001',
      '11111111111111111111',
    ],
    playerSpawn: { x: 2.5, y: 2.5, dir: 0.25 },
    botSpawns: [
      { x: 17.5, y: 2.5 },
      { x: 17.5, y: 14.5 },
      { x: 2.5, y: 14.5 },
      { x: 10.5, y: 8.5 },
      { x: 12.5, y: 4.5 },
      { x: 7.5, y: 12.5 },
    ],
    props: [
      { x: 4.5, y: 4.5, h: 1.2 },
      { x: 6.5, y: 4.5, h: 0.8 },
      { x: 11.5, y: 2.5, h: 1.4 },
      { x: 15.5, y: 6.5, h: 1.2 },
      { x: 3.5, y: 10.5, h: 1 },
      { x: 9.5, y: 14.5, h: 1.1 },
      { x: 14.5, y: 12.5, h: 0.9 },
    ],
  },
];

export function wallAt(map, x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (iy < 0 || iy >= map.grid.length || ix < 0 || ix >= map.grid[0].length) return '1';
  return map.grid[iy][ix];
}
