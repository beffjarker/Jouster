import { createRng } from '@jouster/game/engine';

/**
 * Builds the overworld from a fixed seed, so every player gets the same large map without
 * hand-typing thousands of tiles. Landmarks are placed by hand; terrain comes from value noise;
 * roads are carved with a cheapest-path search so every landmark is reachable from Aldmere.
 *
 * Tile characters match `OVERWORLD_LEGEND` in maps.ts.
 */

export const OVERWORLD_W = 96;
export const OVERWORLD_H = 72;
export const OVERWORLD_SEED = 0x5eed_0a1d;

export interface Point {
  x: number;
  y: number;
}

/** Hand-placed landmarks (tile coordinates). */
export const LANDMARKS = {
  aldmere: { x: 24, y: 36 },
  goblinCave: { x: 78, y: 10 },
  thornwick: { x: 70, y: 54 },
  brookhollow: { x: 18, y: 60 },
  /** Cave in the far eastern hills (Alpha Wolf side quest). */
  wolfDen: { x: 88, y: 32 },
  /** West shore of the southern lake (Giant Toad side quest). */
  lakeshore: { x: 38, y: 62 },
  /** Mountain pass on the southern rim, gated until Act I is complete (leads to the Southlands). */
  southPass: { x: 60, y: 69 },
} as const satisfies Record<string, Point>;

const GRASS = '.';
const ROAD = ':';
const FOREST = 'f';
const HILLS = 'h';
const MOUNTAIN = '^';
const WATER = '~';
const BRIDGE = '=';
const CLUE_NET = 'n';

export type Grid = string[][];

/** Smooth 2D value noise in [0, 1) over a `width` x `height` area, built from a coarse random lattice. */
export function valueNoise(seed: number, cell: number, width = OVERWORLD_W, height = OVERWORLD_H): (x: number, y: number) => number {
  const rng = createRng(seed);
  const cols = Math.ceil(width / cell) + 2;
  const rows = Math.ceil(height / cell) + 2;
  const lattice = Array.from({ length: rows }, () => Array.from({ length: cols }, () => rng.next()));
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = x / cell;
    const gy = y / cell;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const tx = smooth(gx - x0);
    const ty = smooth(gy - y0);
    const a = lattice[y0][x0] + (lattice[y0][x0 + 1] - lattice[y0][x0]) * tx;
    const b = lattice[y0 + 1][x0] + (lattice[y0 + 1][x0 + 1] - lattice[y0 + 1][x0]) * tx;
    return a + (b - a) * ty;
  };
}

function inside(g: Grid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && y < g.length && x < g[0].length;
}

/** Sets every tile within `radius` of (cx, cy) to `ch`. */
export function fill(g: Grid, cx: number, cy: number, radius: number, ch: string): void {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (inside(g, x, y) && (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius + 1) {
        g[y][x] = ch;
      }
    }
  }
}

function terrain(): Grid {
  const elevA = valueNoise(OVERWORLD_SEED, 12);
  const elevB = valueNoise(OVERWORLD_SEED + 1, 5);
  const moistA = valueNoise(OVERWORLD_SEED + 2, 10);
  const moistB = valueNoise(OVERWORLD_SEED + 3, 4);
  const edgeN = valueNoise(OVERWORLD_SEED + 4, 6);
  const g: Grid = [];
  for (let y = 0; y < OVERWORLD_H; y++) {
    const row: string[] = [];
    for (let x = 0; x < OVERWORLD_W; x++) {
      const edge = Math.min(x, y, OVERWORLD_W - 1 - x, OVERWORLD_H - 1 - y);
      // The north-east rises into the goblin hills; the south-west is old, wet forest.
      const ne = (x / OVERWORLD_W) * (1 - y / OVERWORLD_H);
      const sw = (1 - x / OVERWORLD_W) * (y / OVERWORLD_H);
      const elev = 0.7 * elevA(x, y) + 0.3 * elevB(x, y) + 0.35 * ne - 0.1;
      const moist = 0.65 * moistA(x, y) + 0.35 * moistB(x, y) + 0.3 * sw - 0.08;
      let ch = GRASS;
      if (edge < 2 + Math.floor(edgeN(x, y) * 3)) {
        ch = MOUNTAIN;
      } else if (elev > 0.74) {
        ch = MOUNTAIN;
      } else if (elev > 0.56) {
        ch = HILLS;
      } else if (moist > 0.6) {
        ch = FOREST;
      } else if (moist < 0.2 && elev < 0.4) {
        ch = WATER;
      }
      row.push(ch);
    }
    g.push(row);
  }
  return g;
}

/** A river flowing from the northern peaks to a lake in the south, west of the hills. */
function carveRiver(g: Grid): void {
  const wobble = valueNoise(OVERWORLD_SEED + 5, 9);
  for (let y = 2; y < OVERWORLD_H - 8; y++) {
    const cx = Math.round(46 + Math.sin(y / 9) * 4 + (wobble(10, y) - 0.5) * 8);
    for (let x = cx; x < cx + 2; x++) {
      if (g[y][x] !== MOUNTAIN || y > 4) {
        g[y][x] = WATER;
      }
    }
  }
  fill(g, 44, OVERWORLD_H - 10, 4, WATER);
  fill(g, 50, OVERWORLD_H - 9, 3, WATER);
}

function placeLandmarks(g: Grid): void {
  const { aldmere, goblinCave, thornwick, brookhollow, wolfDen, lakeshore } = LANDMARKS;
  fill(g, aldmere.x, aldmere.y, 3, GRASS);
  fill(g, lakeshore.x - 1, lakeshore.y, 2, GRASS);
  fill(g, wolfDen.x, wolfDen.y + 2, 2, HILLS);
  for (let x = wolfDen.x - 2; x <= wolfDen.x + 2; x++) {
    g[wolfDen.y - 1][x] = MOUNTAIN;
  }
  g[wolfDen.y][wolfDen.x - 1] = MOUNTAIN;
  g[wolfDen.y][wolfDen.x + 1] = MOUNTAIN;
  fill(g, brookhollow.x, brookhollow.y, 3, GRASS);
  fill(g, thornwick.x, thornwick.y, 3, GRASS);
  fill(g, goblinCave.x, goblinCave.y + 2, 3, HILLS);
  // A ring of peaks behind the cave mouth.
  for (let x = goblinCave.x - 3; x <= goblinCave.x + 3; x++) {
    g[goblinCave.y - 1][x] = MOUNTAIN;
  }
  g[goblinCave.y][goblinCave.x - 1] = MOUNTAIN;
  g[goblinCave.y][goblinCave.x + 1] = MOUNTAIN;
  // A few charred trees around the ruins.
  for (const [dx, dy] of [
    [-3, -1],
    [3, 1],
    [-2, 2],
    [2, -2],
  ]) {
    g[thornwick.y + dy][thornwick.x + dx] = FOREST;
  }
  g[aldmere.y][aldmere.x] = 'A';
  g[goblinCave.y][goblinCave.x] = 'O';
  g[thornwick.y][thornwick.x] = 'V';
  g[brookhollow.y][brookhollow.x] = 'B';
  g[wolfDen.y][wolfDen.x] = 'W';
  placePass(g);
}

/** A notch in the southern mountains with a grass landing (and room for its guard) in front of it. */
function placePass(g: Grid): void {
  const { southPass: pass } = LANDMARKS;
  for (let y = pass.y - 3; y < pass.y; y++) {
    for (let x = pass.x - 1; x <= pass.x + 1; x++) {
      g[y][x] = GRASS;
    }
  }
  g[pass.y][pass.x - 1] = MOUNTAIN;
  g[pass.y][pass.x + 1] = MOUNTAIN;
  g[pass.y][pass.x] = 'P';
}

function stepCost(ch: string): number {
  switch (ch) {
    case ROAD:
    case BRIDGE:
      return 1;
    case GRASS:
      return 2;
    case FOREST:
    case HILLS:
      return 4;
    case WATER:
      return 12;
    case MOUNTAIN:
      return 40;
    default:
      return 2;
  }
}

/**
 * Cheapest path (Dijkstra with a binary heap) between two tiles of `g`, never using the outermost ring.
 * `cost` prices stepping onto a tile character.
 */
export function cheapestPath(g: Grid, from: Point, to: Point, cost: (ch: string) => number = stepCost): Point[] {
  const W = g[0].length;
  const H = g.length;
  const n = W * H;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heap: [number, number][] = [];
  const push = (item: [number, number]): void => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) {
        break;
      }
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop() as [number, number];
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const start = from.y * W + from.x;
  const goal = to.y * W + to.x;
  dist[start] = 0;
  push([0, start]);
  while (heap.length) {
    const [d, idx] = pop();
    if (idx === goal) {
      break;
    }
    if (d > dist[idx]) {
      continue;
    }
    const x = idx % W;
    const y = (idx - x) / W;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      // Keep roads off the outermost ring so the border stays closed.
      if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) {
        continue;
      }
      const ni = ny * W + nx;
      const nd = d + cost(g[ny][nx]);
      if (nd < dist[ni]) {
        dist[ni] = nd;
        prev[ni] = idx;
        push([nd, ni]);
      }
    }
  }
  const path: Point[] = [];
  for (let i = goal; i !== -1; i = prev[i]) {
    path.push({ x: i % W, y: Math.floor(i / W) });
  }
  return path.reverse();
}

function carveRoad(g: Grid, from: Point, to: Point): void {
  for (const p of cheapestPath(g, from, to)) {
    const ch = g[p.y][p.x];
    if (ch === WATER || ch === BRIDGE) {
      g[p.y][p.x] = BRIDGE;
    } else if (ch === GRASS || ch === FOREST || ch === HILLS || ch === MOUNTAIN) {
      g[p.y][p.x] = ROAD;
    }
  }
}

/** Generates the overworld rows (deterministic). */
export function generateOverworld(): string[] {
  const g = terrain();
  carveRiver(g);
  placeLandmarks(g);
  const { aldmere, goblinCave, thornwick, brookhollow, wolfDen, lakeshore, southPass } = LANDMARKS;
  const below = (p: Point): Point => ({ x: p.x, y: p.y + 1 });
  carveRoad(g, below(aldmere), below(goblinCave));
  carveRoad(g, below(aldmere), below(thornwick));
  carveRoad(g, below(aldmere), below(brookhollow));
  carveRoad(g, below(thornwick), below(wolfDen));
  carveRoad(g, below(brookhollow), { x: lakeshore.x - 1, y: lakeshore.y });
  carveRoad(g, below(thornwick), { x: southPass.x, y: southPass.y - 3 });
  g[southPass.y - 2][southPass.x] = ROAD;
  g[southPass.y - 1][southPass.x] = ROAD;
  // The torn net that hints at the Giant Toad (lakeShore event).
  g[lakeshore.y][lakeshore.x] = CLUE_NET;
  return g.map((row) => row.join(''));
}
