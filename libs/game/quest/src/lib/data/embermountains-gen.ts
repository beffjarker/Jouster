import { createRng } from '@jouster/game/engine';
import { Grid, Point, cheapestPath, fill, valueNoise } from './overworld-gen';

/**
 * Builds the Ember Mountains (finale) from a fixed seed: ash plains ringed by basalt peaks, burnt woods,
 * cinder fields, lava rivers and cooled obsidian flats. The ember pass from the Frost Peaks comes in at the
 * bottom; roads are carved with the same cheapest-path search as the overworld so Emberwatch and
 * Vyrmorth's Lair are reachable. Roads cross lava on cooled obsidian.
 *
 * Tile characters match `EMBER_LEGEND` in maps.ts.
 */

export const EMBER_W = 64;
export const EMBER_H = 48;
export const EMBER_SEED = 0xe3_b0_17;

/** Hand-placed landmarks (tile coordinates). */
export const EMBER_LANDMARKS = {
  /** Where the ember pass from the Frost Peaks comes up. */
  pass: { x: 30, y: 44 },
  emberwatch: { x: 46, y: 32 },
  lair: { x: 30, y: 7 },
} as const satisfies Record<string, Point>;

const ASH = '.';
const CINDERS = 'c';
const DEADWOOD = 'f';
const BASALT = '^';
const LAVA = '~';
const OBSIDIAN = 'o';
const ROAD = ':';

function terrain(): Grid {
  const rng = createRng(EMBER_SEED);
  const elev = valueNoise(EMBER_SEED + 1, 8, EMBER_W, EMBER_H);
  const cinder = valueNoise(EMBER_SEED + 2, 4, EMBER_W, EMBER_H);
  const lava = valueNoise(EMBER_SEED + 3, 6, EMBER_W, EMBER_H);
  const woods = valueNoise(EMBER_SEED + 4, 5, EMBER_W, EMBER_H);
  const edgeN = valueNoise(EMBER_SEED + 5, 5, EMBER_W, EMBER_H);
  const g: Grid = [];
  for (let y = 0; y < EMBER_H; y++) {
    const row: string[] = [];
    for (let x = 0; x < EMBER_W; x++) {
      const edge = Math.min(x, y, EMBER_W - 1 - x, EMBER_H - 1 - y);
      // The volcano rises towards the north, where the dragon sleeps.
      const northBias = (1 - y / EMBER_H) * 0.08;
      let ch: string;
      if (edge < 2 + Math.floor(edgeN(x, y) * 2)) {
        ch = BASALT;
      } else if (elev(x, y) + northBias > 0.8) {
        ch = BASALT;
      } else if (lava(x, y) > 0.74) {
        ch = lava(x, y) > 0.8 ? LAVA : OBSIDIAN;
      } else if (woods(x, y) > 0.62) {
        ch = DEADWOOD;
      } else {
        ch = cinder(x, y) > 0.62 ? CINDERS : ASH;
        if (ch === ASH && rng.next() < 0.03) {
          ch = DEADWOOD;
        }
      }
      row.push(ch);
    }
    g.push(row);
  }
  return g;
}

function placeLandmarks(g: Grid): void {
  const { pass, emberwatch, lair } = EMBER_LANDMARKS;
  // The pass: a notch in the southern wall with open ash above it.
  fill(g, pass.x, pass.y - 2, 2, ASH);
  for (let y = pass.y + 1; y < EMBER_H; y++) {
    g[y][pass.x] = BASALT;
  }
  g[pass.y][pass.x - 1] = BASALT;
  g[pass.y][pass.x + 1] = BASALT;
  fill(g, emberwatch.x, emberwatch.y, 3, ASH);
  fill(g, lair.x, lair.y + 2, 2, OBSIDIAN);
  // The volcano's flank behind the lair mouth.
  for (let x = lair.x - 4; x <= lair.x + 4; x++) {
    g[lair.y - 1][x] = BASALT;
    g[lair.y - 2][x] = BASALT;
  }
  g[lair.y][lair.x - 1] = BASALT;
  g[lair.y][lair.x + 1] = BASALT;
  g[pass.y][pass.x] = 'S';
  g[emberwatch.y][emberwatch.x] = 'E';
  g[lair.y][lair.x] = 'L';
}

function stepCost(ch: string): number {
  switch (ch) {
    case ROAD:
      return 1;
    case ASH:
    case OBSIDIAN:
      return 2;
    case CINDERS:
    case DEADWOOD:
      return 4;
    case LAVA:
      return 16;
    case BASALT:
      return 60;
    default:
      return 2;
  }
}

/** Trodden ash road; it crosses lava on cooled obsidian. */
function carveRoad(g: Grid, from: Point, to: Point): void {
  for (const p of cheapestPath(g, from, to, stepCost)) {
    const ch = g[p.y][p.x];
    if (ch === LAVA) {
      g[p.y][p.x] = OBSIDIAN;
    } else if ([ASH, CINDERS, DEADWOOD, BASALT].includes(ch)) {
      g[p.y][p.x] = ROAD;
    }
  }
}

/** Generates the Ember Mountains rows (deterministic). */
export function generateEmberMountains(): string[] {
  const g = terrain();
  placeLandmarks(g);
  const { pass, emberwatch, lair } = EMBER_LANDMARKS;
  const above = (p: Point): Point => ({ x: p.x, y: p.y - 1 });
  const below = (p: Point): Point => ({ x: p.x, y: p.y + 1 });
  carveRoad(g, above(pass), below(emberwatch));
  carveRoad(g, below(emberwatch), below(lair));
  return g.map((row) => row.join(''));
}
