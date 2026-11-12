/** Creates an off-screen canvas (browser only). */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Builds full rows from left halves by mirroring them, so symmetric sprites only need
 * half the data. `'..kk'` -> `'..kkkk..'`.
 */
export function mirrorRows(halves: readonly string[]): string[] {
  return halves.map((h) => h + [...h].reverse().join(''));
}

/** Flips rows horizontally. */
export function flipRows(rows: readonly string[]): string[] {
  return rows.map((r) => [...r].reverse().join(''));
}

/**
 * Palette: character -> CSS colour. `.` (or any unmapped character) is transparent.
 */
export type Palette = ReadonlyMap<string, string>;

export function palette(entries: ReadonlyArray<[string, string]>): Palette {
  return new Map(entries);
}

/** Renders pixel-art rows into a new canvas, optionally scaled up by an integer factor. */
export function pixelArtToCanvas(rows: readonly string[], colors: Palette, scale = 1): HTMLCanvasElement {
  const height = rows.length;
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  const canvas = createCanvas(width * scale, height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = colors.get(row[x]);
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  });
  return canvas;
}
