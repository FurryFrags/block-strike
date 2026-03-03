export const WEAPONS = [
  { id: 'thompson', era: 'WW2', name: 'Thompson M1A1', damage: 19, fireRate: 9.2, magSize: 30, reserve: 150, reload: 2.3, spread: 0.035, range: 14 },
  { id: 'mp40', era: 'WW2', name: 'MP40', damage: 21, fireRate: 8.1, magSize: 32, reserve: 160, reload: 2.5, spread: 0.03, range: 14 },
  { id: 'ak47', era: 'Cold War', name: 'AK-47', damage: 33, fireRate: 6.2, magSize: 30, reserve: 120, reload: 2.7, spread: 0.02, range: 18 },
  { id: 'm4', era: 'Modern', name: 'M4A1', damage: 28, fireRate: 8.5, magSize: 30, reserve: 150, reload: 2.2, spread: 0.018, range: 20 },
  { id: 'scar', era: 'Modern', name: 'SCAR-H', damage: 36, fireRate: 5.4, magSize: 20, reserve: 100, reload: 2.4, spread: 0.016, range: 24 },
  { id: 'vector', era: 'Modern', name: 'Vector .45', damage: 20, fireRate: 12.5, magSize: 25, reserve: 175, reload: 2.0, spread: 0.028, range: 12 },
];

export const MAPS = [
  {
    id: 'blockyard',
    name: 'Blockyard Clash',
    grid: [
      '1111111111111111',
      '1000000000000001',
      '1011110111111101',
      '1000010100000101',
      '1011010101110101',
      '1010010001010001',
      '1011111101011111',
      '1000000101000001',
      '1110110101110101',
      '1000100000010101',
      '1011111111010101',
      '1000000000010001',
      '1111111111111111',
    ],
    playerSpawn: { x: 2.5, y: 2.5, dir: 0.2 },
    botSpawns: [
      { x: 12.5, y: 2.5 },
      { x: 13.5, y: 10.5 },
      { x: 3.5, y: 9.5 },
      { x: 8.5, y: 6.5 },
      { x: 10.5, y: 4.5 },
    ],
  },
];

export function wallAt(map, x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (iy < 0 || iy >= map.grid.length || ix < 0 || ix >= map.grid[0].length) return '1';
  return map.grid[iy][ix];
}
