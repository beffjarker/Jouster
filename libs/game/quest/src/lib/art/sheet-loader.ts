import type { ArtSheets } from './art';
import { LPC_SHEETS, LpcSheetId, lpcSheetUrl } from './lpc-manifest';

/** Loads one image URL; injectable so tests run without a browser. */
export type ImageLoader = (url: string) => Promise<CanvasImageSource>;

/** Default loader: an `Image` element that resolves once decoded. */
export const browserImageLoader: ImageLoader = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });

/**
 * Loads every LPC sheet from `base` (the folder URL). Rejects if any sheet fails, so callers can keep
 * the procedural art instead of mixing partial sheets.
 */
export async function loadLpcSheets(base?: string, load: ImageLoader = browserImageLoader): Promise<ArtSheets> {
  const ids = Object.keys(LPC_SHEETS) as LpcSheetId[];
  const images = await Promise.all(ids.map((id) => load(lpcSheetUrl(id, base))));
  return new Map(ids.map((id, i) => [id, images[i]]));
}
