import { createRng } from '@jouster/game/engine';
import { Grid, Point, cheapestPath, fill, valueNoise } from './overworld-gen';

/**
 * Builds the Frost Peaks (Act III) from a fixed seed: a snowfield ringed by glacier peaks, dark pine
 * woods, drifts and frozen lakes. The northern pass from Greenwood Vale comes in at the bottom; roads are
 * carved with the same cheapest-path search as the overworld so Frostgate and the Wyvern Roost are reachable.
 *
 * Tile characters match `FROSTPEAKS_LEGEND` in maps.ts.
 */

export const FROSTPEAKS_W = 64;
export const FROSTPEAKS_H = 48;
export const FROSTPEAKS_SEED = 0xf2_05_7a;

/** Hand-placed landmarks (tile coordinates). */
export const NORTH_LANDMARKS = {
  /** Where the northern pass from Greenwood Vale comes up. */
  pass: { x: 32, y: 44 },
  frostgate: { x: 16, y: 28 },
  wyvernRoost: { x: 46, y: 8 },
} as const satisfies Record<string, Point>;

const SNOW = '.';
const DRIFT = 'd';
const PINE = 'f';
const PEAK = '^';
const ICE = 'i';
const WATER = '~';
const ROAD = ':';

function terrain(): Grid {
  const rng = createRng(FROSTPEAKS_SEED);
  const elev = valueNoise(FROSTPEAKS_SEED + 1, 8, FROSTPEAKS_W, FROSTPEAKS_H);
  const drift = valueNoise(FROSTPEAKS_SEED + 2, 4, FROSTPEAKS_W, FROSTPEAKS_H);
  const lake = valueNoise(FROSTPEAKS_SEED + 3, 7, FROSTPEAKS_W, FROSTPEAKS_H);
  const woods = valueNoise(FROSTPEAKS_SEED + 4, 5, FROSTPEAKS_W, FROSTPEAKS_H);
  const edgeN = valueNoise(FROSTPEAKS_SEED + 5, 5, FROSTPEAKS_W, FROSTPEAKS_H);
  const g: Grid = [];
  for (let y = 0; y < FROSTPEAKS_H; y++) {
    const row: string[] = [];
    for (let x = 0; x < FROSTPEAKS_W; x++) {
      const edge = Math.min(x, y, FROSTPEAKS_W - 1 - x, FROSTPEAKS_H - 1 - y);
      let ch: string;
      // The range grows taller towards the north, where the wyverns nest.
      const northBias = (1 - y / FROSTPEAKS_H) * 0.08;
      if (edge < 2 + Math.floor(edgeN(x, y) * 2)) {
        ch = PEAK;
      } else if (elev(x, y) + northBias > 0.8) {
        ch = PEAK;
      } else if (lake(x, y) > 0.76) {
        ch = lake(x, y) > 0.84 ? WATER : ICE;
      } else if (woods(x, y) > 0.6) {
        ch = PINE;
      } else {
        ch = drift(x, y) > 0.62 ? DRIFT : SNOW;
        if (ch === SNOW && rng.next() < 0.03) {
          ch = PINE;
        }
      }
      row.push(ch);
    }
    g.push(row);
  }
  return g;
}

function placeLandmarks(g: Grid): void {
  const { pass, frostgate, wyvernRoost } = NORTH_LANDMARKS;
  // The pass: a notch in the southern wall with open snow above it.
  fill(g, pass.x, pass.y - 2, 2, SNOW);
  for (let y = pass.y + 1; y < FROSTPEAKS_H; y++) {
    g[y][pass.x] = PEAK;
  }
  g[pass.y][pass.x - 1] = PEAK;
  g[pass.y][pass.x + 1] = PEAK;
  fill(g, frostgate.x, frostgate.y, 3, SNOW);
  fill(g, wyvernRoost.x, wyvernRoost.y + 2, 2, SNOW);
  // A crag behind the roost's cave mouth.
  for (let x = wyvernRoost.x - 3; x <= wyvernRoost.x + 3; x++) {
    g[wyvernRoost.y - 1][x] = PEAK;
  }
  g[wyvernRoost.y][wyvernRoost.x - 1] = PEAK;
  g[wyvernRoost.y][wyvernRoost.x + 1] = PEAK;
  g[pass.y][pass.x] = 'N';
  g[frostgate.y][frostgate.x] = 'F';
  g[wyvernRoost.y][wyvernRoost.x] = 'R';
}

function stepCost(ch: string): number {
  switch (ch) {
    case ROAD:
      return 1;
    case SNOW:
    case ICE:
      return 2;
    case DRIFT:
    case PINE:
      return 4;
    case WATER:
      return 16;
    case PEAK:
      return 60;
    default:
      return 2;
  }
}

/** Trodden snow road; it crosses frozen water as ice. */
function carveRoad(g: Grid, from: Point, to: Point): void {
  for (const p of cheapestPath(g, from, to, stepCost)) {
    const ch = g[p.y][p.x];
    if (ch === WATER) {
      g[p.y][p.x] = ICE;
    } else if ([SNOW, DRIFT, PINE, PEAK].includes(ch)) {
      g[p.y][p.x] = ROAD;
    }
  }
}

/** Generates the Frost Peaks rows (deterministic). */
export function generateFrostPeaks(): string[] {
  const g = terrain();
  placeLandmarks(g);
  const { pass, frostgate, wyvernRoost } = NORTH_LANDMARKS;
  const above = (p: Point): Point => ({ x: p.x, y: p.y - 1 });
  const below = (p: Point): Point => ({ x: p.x, y: p.y + 1 });
  carveRoad(g, above(pass), below(frostgate));
  carveRoad(g, below(frostgate), below(wyvernRoost));
  return g.map((row) => row.join(''));
}
