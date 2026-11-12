import { GameState } from './game-state';

/** How many tiles around the party are revealed in the open wilds. */
export const FOG_RADIUS = 4;
/** Caves are darker: the party sees one tile less. */
export const CAVE_FOG_RADIUS = FOG_RADIUS - 1;

const WORD_BITS = 32;

/** True when (dx, dy) lies inside a rounded circle of `radius` tiles. */
export function inSight(dx: number, dy: number, radius: number): boolean {
  return dx * dx + dy * dy <= radius * radius + radius;
}

/**
 * True when tile (x, y) of a map `width` tiles wide has been explored. `bits` is the map's
 * row-major bitset from `GameState.explored` (missing = nothing explored yet).
 */
export function isExplored(bits: readonly number[] | undefined, width: number, x: number, y: number): boolean {
  if (!bits || x < 0 || y < 0 || x >= width) {
    return false;
  }
  const i = y * width + x;
  return ((bits[i >>> 5] ?? 0) & (1 << (i & (WORD_BITS - 1)))) !== 0;
}

/**
 * Marks every tile within `radius` of (cx, cy) as explored on `mapId`. Returns true when at
 * least one new tile was revealed.
 */
export function revealAround(
  state: GameState,
  mapId: string,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): boolean {
  const words = Math.ceil((width * height) / WORD_BITS);
  let bits = state.explored[mapId];
  if (!bits || bits.length !== words) {
    bits = new Array<number>(words).fill(0);
    state.explored[mapId] = bits;
  }
  let changed = false;
  for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
      if (!inSight(x - cx, y - cy, radius)) {
        continue;
      }
      const i = y * width + x;
      const mask = 1 << (i & (WORD_BITS - 1));
      const w = i >>> 5;
      if ((bits[w] & mask) === 0) {
        bits[w] = (bits[w] | mask) | 0;
        changed = true;
      }
    }
  }
  return changed;
}

/** Fraction (0..1) of a map's tiles that have been explored. */
export function exploredRatio(bits: readonly number[] | undefined, width: number, height: number): number {
  if (!bits) {
    return 0;
  }
  let count = 0;
  for (let i = 0; i < width * height; i++) {
    if (bits[i >>> 5] & (1 << (i & (WORD_BITS - 1)))) {
      count++;
    }
  }
  return count / (width * height);
}
