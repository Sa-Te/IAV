import type { MediaBytes } from "./state.js";

/**
 * Thumbnail geometry, in core where it can be tested in Node.
 *
 * The decode/draw/encode half needs `createImageBitmap` + `OffscreenCanvas`, so it
 * is injected (`ThumbnailEncoder`) and lives in the worker. The arithmetic — the
 * part that can be wrong in a way nobody notices — is here.
 */

export const THUMBNAIL_MAX_EDGE = 512;
export const THUMBNAIL_QUALITY = 0.8;

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

/** Scale so the long edge is at most `maxEdge`, preserving aspect; never upscale. */
export function thumbnailDimensions(
  width: number,
  height: number,
  maxEdge: number = THUMBNAIL_MAX_EDGE,
): Dimensions {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export interface ThumbnailEncoder<T extends MediaBytes> {
  /** Natural size of the source, or null when it cannot be read. */
  measure(source: T): Promise<Dimensions | null>;
  encode(source: T, target: Dimensions): Promise<{ blob: T; type: string } | null>;
}

/**
 * Returns null when the source cannot be decoded or encoded. The caller turns
 * that into `failed: decode` — never into a permanent pending state.
 */
export async function makeThumbnail<T extends MediaBytes>(
  source: T,
  encoder: ThumbnailEncoder<T>,
  maxEdge: number = THUMBNAIL_MAX_EDGE,
): Promise<{ blob: T; type: string; width: number; height: number } | null> {
  const natural = await encoder.measure(source);
  if (natural === null) return null;
  const target = thumbnailDimensions(natural.width, natural.height, maxEdge);
  const encoded = await encoder.encode(source, target);
  if (encoded === null) return null;
  // Accept whatever the encoder produced: Safari has historically ignored the webp
  // request and returned png, and the stored type must follow the bytes.
  return { blob: encoded.blob, type: encoded.type, width: target.width, height: target.height };
}
