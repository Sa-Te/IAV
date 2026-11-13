import { DEFAULT_WINDOW_SIZE } from "@instavault/core";

/**
 * The window's texture lifetime: 96 layers, reused.
 *
 * The budget is a hard cap, not a target. A vortex that grows its resident set
 * with the archive is the same bug as the old unbounded blob Map — it just leaks
 * in native memory where the profiler is less friendly. So allocation has exactly
 * one way to fail: a thrown Error. There is no "test mode grows, production
 * reports" branch, because a branch only tests exercise is not a test.
 *
 * Bitmaps are closed the moment their pixels are uploaded (or immediately, if the
 * card left the window while the request was in flight).
 */

/**
 * The window refused to grow. Typed so the route can tell "this device cannot hold
 * the 3D view" apart from a genuine bug and degrade instead of crashing.
 */
export class TextureBudgetError extends Error {
  override readonly name = "TextureBudgetError";
  constructor(
    readonly requested: number,
    readonly cap: number,
  ) {
    super(`texture window exceeded its ${cap}-layer budget (requested ${requested})`);
  }
}

export const THUMBNAIL_SIZE = 256;
export const BYTES_PER_PIXEL = 4;

export interface LayerSink {
  readonly layerCount: number;
  upload(
    layer: number,
    bitmap: ImageBitmap,
    index: number,
    size: { width: number; height: number },
  ): void;
  clear(layer: number): void;
}

export interface BitmapSource {
  /** At most `size` on the long edge; null when the thumbnail cannot be made. */
  request(index: number, size: number): Promise<ImageBitmap | null>;
}

export interface TextureStats {
  readonly resident: number;
  readonly bytes: number;
  /** Indices currently waiting for a bitmap. */
  readonly pending: number;
  /** Indices asked once and found impossible (a video, an undecodable file). */
  readonly failed: number;
}

export interface TextureWindow {
  setWindow(indices: readonly number[]): Promise<void>;
  close(): void;
  stats(): TextureStats;
}

interface Resident {
  readonly layer: number;
  readonly bytes: number;
}

export function createTextureWindow(
  sink: LayerSink,
  source: BitmapSource,
  windowSize: number = DEFAULT_WINDOW_SIZE,
): TextureWindow {
  if (sink.layerCount < windowSize) {
    throw new Error(`texture window needs ${windowSize} layers, the sink has ${sink.layerCount}`);
  }

  const resident = new Map<number, Resident>();
  // The free list *is* the allocator: every layer starts free, and a layer only
  // exists again once it has been released. (Two allocation sources would hand out
  // the same layer twice, which is exactly the bug this single list prevents.)
  const free: number[] = [];
  for (let layer = sink.layerCount - 1; layer >= 0; layer -= 1) free.push(layer);
  const pending = new Map<number, Promise<void>>();
  const wanted = new Set<number>();
  // Indices whose bitmap could not be produced. Asked once and remembered: a
  // video has no still frame at 256px, and re-asking every frame is the request
  // storm that starved the window on a real archive (M17).
  const failed = new Set<number>();
  let closed = false;

  const takeLayer = (): number => {
    const layer = free.pop();
    if (layer === undefined) {
      // 96 in, 96 out: reaching here means the caller asked for more than the
      // budget without leaving a layer behind.
      throw new TextureBudgetError(resident.size + 1, sink.layerCount);
    }
    return layer;
  };

  const release = (index: number): void => {
    const entry = resident.get(index);
    if (entry === undefined) return;
    sink.clear(entry.layer);
    resident.delete(index);
    free.push(entry.layer);
  };

  const request = (index: number): Promise<void> => {
    const work = (async () => {
      const bitmap = await source.request(index, THUMBNAIL_SIZE);
      if (bitmap === null) {
        failed.add(index);
        return;
      }
      // The window may have moved while we waited: close the pixels rather than
      // uploading a card nobody will draw. No layer was taken, so none is lost.
      if (closed || !wanted.has(index) || resident.has(index)) {
        bitmap.close();
        return;
      }
      // Read the size *before* close: an ImageBitmap reports 0x0 once closed, so
      // measuring afterwards kept the resident-byte total at 0 with 16 textures
      // resident (seen in the M16 browser run).
      const { width, height } = bitmap;
      // The layer is taken at the moment of upload, never at the moment of asking.
      // Pinning one per request meant every null or late bitmap kept a layer for
      // good: 96 of them exhausted the budget, `setWindow` threw on every frame,
      // and the scene went black on a real 392-item archive.
      const layer = takeLayer();
      sink.upload(layer, bitmap, index, { width, height });
      bitmap.close();
      resident.set(index, {
        layer,
        bytes: width * height * BYTES_PER_PIXEL,
      });
    })();

    pending.set(index, work);
    return work.finally(() => pending.delete(index));
  };

  return {
    async setWindow(indices) {
      wanted.clear();
      for (const index of indices) wanted.add(index);

      for (const index of [...resident.keys()]) {
        if (!wanted.has(index)) release(index);
      }

      const requests: Promise<void>[] = [];
      for (const index of indices) {
        if (resident.has(index) || failed.has(index)) continue;
        const inFlight = pending.get(index);
        if (inFlight !== undefined) {
          requests.push(inFlight);
          continue;
        }
        requests.push(request(index));
      }

      await Promise.all(requests);
    },

    close() {
      closed = true;
      wanted.clear();
      for (const index of [...resident.keys()]) release(index);
      pending.clear();
    },

    stats() {
      let bytes = 0;
      for (const entry of resident.values()) bytes += entry.bytes;
      return { resident: resident.size, bytes, pending: pending.size, failed: failed.size };
    },
  };
}
