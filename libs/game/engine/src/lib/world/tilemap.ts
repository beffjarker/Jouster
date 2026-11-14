export interface TileDef {
  /** Single character used in map strings. */
  char: string;
  id: string;
  solid: boolean;
  /** Encounter table id used when stepping on this tile (absent = safe). */
  encounterTableId?: string;
}

export type Facing = 'up' | 'down' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export const FACING_DELTA: Readonly<Record<Facing, Point>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * Grid map built from rows of characters and a tile legend.
 * Out-of-bounds tiles are treated as solid.
 */
export class TileMap {
  public readonly width: number;
  public readonly height: number;
  private readonly legend: Map<string, TileDef>;

  constructor(
    private readonly rows: readonly string[],
    legend: readonly TileDef[],
  ) {
    if (rows.length === 0) {
      throw new Error('TileMap needs at least one row');
    }
    this.width = rows[0].length;
    this.height = rows.length;
    this.legend = new Map(legend.map((t) => [t.char, t]));
    rows.forEach((row, y) => {
      if (row.length !== this.width) {
        throw new Error(`TileMap row ${y} has width ${row.length}, expected ${this.width}`);
      }
      for (const ch of row) {
        if (!this.legend.has(ch)) {
          throw new Error(`TileMap row ${y} uses unknown tile '${ch}'`);
        }
      }
    });
  }

  public inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  public charAt(x: number, y: number): string | undefined {
    return this.inBounds(x, y) ? this.rows[y][x] : undefined;
  }

  public tileAt(x: number, y: number): TileDef | undefined {
    const ch = this.charAt(x, y);
    return ch === undefined ? undefined : this.legend.get(ch);
  }

  public isSolid(x: number, y: number): boolean {
    return this.tileAt(x, y)?.solid ?? true;
  }

  /** All positions of a tile character. */
  public find(char: string): Point[] {
    const points: Point[] = [];
    this.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === char) {
          points.push({ x, y });
        }
      }
    });
    return points;
  }
}
