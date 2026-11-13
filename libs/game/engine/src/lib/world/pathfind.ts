import { FACING_DELTA, Facing, Point } from './tilemap';

const ORDER: readonly Facing[] = ['up', 'down', 'left', 'right'];

/**
 * Breadth-first search over a grid; returns the first step of a shortest path from `start` to any tile
 * that satisfies `isGoal`, or null when no goal is reachable within `maxNodes` visited tiles (or `start` is
 * already a goal). `passable` decides which tiles may be entered; goal tiles are entered regardless.
 */
export function firstStepToward(
  start: Point,
  isGoal: (x: number, y: number) => boolean,
  passable: (x: number, y: number) => boolean,
  maxNodes = 4096,
): Facing | null {
  if (isGoal(start.x, start.y)) {
    return null;
  }
  const key = (x: number, y: number): string => `${x},${y}`;
  const firstStep = new Map<string, Facing>([[key(start.x, start.y), 'down']]);
  const queue: Point[] = [start];
  for (let head = 0; head < queue.length && head < maxNodes; head++) {
    const cur = queue[head];
    const via = head === 0 ? undefined : firstStep.get(key(cur.x, cur.y));
    for (const dir of ORDER) {
      const nx = cur.x + FACING_DELTA[dir].x;
      const ny = cur.y + FACING_DELTA[dir].y;
      const k = key(nx, ny);
      if (firstStep.has(k)) {
        continue;
      }
      const step = via ?? dir;
      if (isGoal(nx, ny)) {
        return step;
      }
      if (!passable(nx, ny)) {
        continue;
      }
      firstStep.set(k, step);
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}
