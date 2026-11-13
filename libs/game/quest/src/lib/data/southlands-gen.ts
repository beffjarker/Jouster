import { createRng } from '@jouster/game/engine';
import { Grid, Point, cheapestPath, fill, valueNoise } from './overworld-gen';

/**
 * Builds the Southlands (Act II) from a fixed seed: sun-baked desert in the west, a sunken marsh in
 * the east, split by a wavering boundary. Roads are carved with the same cheapest-path search as the
 * overworld so every landmark is reachable from the northern pass.
 *
 * Tile characters match `SOUTHLANDS_LEGEND` in maps.ts.
 */

export const SOUTHLANDS_W = 64;
export const SOUTHLANDS_H = 48;
export const SOUTHLANDS_SEED = 0x50_7a_1d;

/** Hand-placed landmarks (tile coordinates). */
export const SOUTH_LANDMARKS = {
  /** Where the mountain pass from Greenwood Vale comes down. */
  pass: { x: 30, y: 3 },
  sandhollow: { x: 16, y: 14 },
  sunShrine: { x: 12, y: 38 },
  mireShrine: { x: 52, y: 38 },
} as const satisfies Record<string, Point>;

const SAND = 's';
const DUNES = 'd';
const CACTUS = 'c';
const MESA = '^';
const MIRE_ROCK = 'r';
const MARSH = 'm';
const MIRE_TREE = 'x';
const BOG = 'b';
const WATER = '~';
const ROAD = ':';
const BOARDWALK = ';';

/** True where the land is marsh rather than desert (east of a noisy line around x = 34). */
function marshMask(): boolean[][] {
  const wobble = valueNoise(SOUTHLANDS_SEED + 9, 8, SOUTHLANDS_W, SOUTHLANDS_H);
  return Array.from({ length: SOUTHLANDS_H }, (_, y) =>
    Array.from({ length: SOUTHLANDS_W }, (_, x) => x > 34 + Math.round((wobble(x, y) - 0.5) * 10)),
  );
}

function terrain(marsh: boolean[][]): Grid {
  const rng = createRng(SOUTHLANDS_SEED);
  const elev = valueNoise(SOUTHLANDS_SEED + 1, 9, SOUTHLANDS_W, SOUTHLANDS_H);
  const dune = valueNoise(SOUTHLANDS_SEED + 2, 4, SOUTHLANDS_W, SOUTHLANDS_H);
  const wet = valueNoise(SOUTHLANDS_SEED + 3, 6, SOUTHLANDS_W, SOUTHLANDS_H);
  const trees = valueNoise(SOUTHLANDS_SEED + 4, 4, SOUTHLANDS_W, SOUTHLANDS_H);
  const edgeN = valueNoise(SOUTHLANDS_SEED + 5, 5, SOUTHLANDS_W, SOUTHLANDS_H);
  const g: Grid = [];
  for (let y = 0; y < SOUTHLANDS_H; y++) {
    const row: string[] = [];
    for (let x = 0; x < SOUTHLANDS_W; x++) {
      const edge = Math.min(x, y, SOUTHLANDS_W - 1 - x, SOUTHLANDS_H - 1 - y);
      let ch: string;
      if (edge < 2 + Math.floor(edgeN(x, y) * 2)) {
        ch = MESA;
      } else if (!marsh[y][x]) {
        const e = elev(x, y);
        ch = e > 0.79 ? MESA : dune(x, y) > 0.6 ? DUNES : SAND;
        if (ch === SAND && rng.next() < 0.045) {
          ch = CACTUS;
        }
      } else {
        const w = wet(x, y);
        ch = w > 0.74 ? WATER : w > 0.62 ? BOG : trees(x, y) > 0.58 ? MIRE_TREE : MARSH;
      }
      row.push(ch);
    }
    g.push(row);
  }
  return g;
}

function placeLandmarks(g: Grid, marsh: boolean[][]): void {
  const { pass, sandhollow, sunShrine, mireShrine } = SOUTH_LANDMARKS;
  const clear = (p: Point, r: number): void => fill(g, p.x, p.y, r, marsh[p.y][p.x] ? MARSH : SAND);
  // The pass: a notch in the northern wall with open sand below it.
  clear({ x: pass.x, y: pass.y + 2 }, 2);
  for (let y = 0; y < pass.y; y++) {
    g[y][pass.x] = MESA;
  }
  g[pass.y][pass.x - 1] = MESA;
  g[pass.y][pass.x + 1] = MESA;
  clear(sandhollow, 3);
  clear({ x: sunShrine.x, y: sunShrine.y + 2 }, 2);
  clear({ x: mireShrine.x, y: mireShrine.y + 2 }, 2);
  // Rock faces behind both shrine doors: sandstone in the desert, mossy boulders in the marsh.
  for (const [s, rock] of [[sunShrine, MESA], [mireShrine, MIRE_ROCK]] as const) {
    for (let x = s.x - 2; x <= s.x + 2; x++) {
      g[s.y - 1][x] = rock;
    }
    g[s.y][s.x - 1] = rock;
    g[s.y][s.x + 1] = rock;
  }
  g[pass.y][pass.x] = 'N';
  g[sandhollow.y][sandhollow.x] = 'S';
  g[sunShrine.y][sunShrine.x] = 'U';
  g[mireShrine.y][mireShrine.x] = 'M';
}

function stepCost(ch: string): number {
  switch (ch) {
    case ROAD:
    case BOARDWALK:
      return 1;
    case SAND:
    case MARSH:
      return 2;
    case DUNES:
    case MIRE_TREE:
      return 4;
    case CACTUS:
      return 10;
    case BOG:
    case WATER:
      return 14;
    case MESA:
    case MIRE_ROCK:
      return 60;
    default:
      return 2;
  }
}

/** Sandy road in the desert, raised boardwalk across the marsh. */
function carveRoad(g: Grid, marsh: boolean[][], from: Point, to: Point): void {
  for (const p of cheapestPath(g, from, to, stepCost)) {
    const ch = g[p.y][p.x];
    if ([SAND, DUNES, CACTUS, MESA, MARSH, MIRE_TREE, BOG, WATER].includes(ch)) {
      g[p.y][p.x] = marsh[p.y][p.x] ? BOARDWALK : ROAD;
    }
  }
}

/** Generates the Southlands rows (deterministic). */
export function generateSouthlands(): string[] {
  const marsh = marshMask();
  const g = terrain(marsh);
  placeLandmarks(g, marsh);
  const { pass, sandhollow, sunShrine, mireShrine } = SOUTH_LANDMARKS;
  const below = (p: Point): Point => ({ x: p.x, y: p.y + 1 });
  carveRoad(g, marsh, below(pass), below(sandhollow));
  carveRoad(g, marsh, below(sandhollow), below(sunShrine));
  carveRoad(g, marsh, below(pass), below(mireShrine));
  return g.map((row) => row.join(''));
}
