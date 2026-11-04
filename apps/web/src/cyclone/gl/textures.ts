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
  upload(layer: number, bitmap: ImageBitmap, index: number): void;
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

  const request = (index: number, layer: number): Promise<void> => {
    const work = (async () => {
      const bitmap = await source.request(index, THUMBNAIL_SIZE);
      // The window may have moved while we waited: close the pixels rather than
      // uploading a card nobody will draw.
      if (bitmap === null) return;
      if (closed || !wanted.has(index) || resident.has(index)) {
        bitmap.close();
        return;
      }
      sink.upload(layer, bitmap, index);
      bitmap.close();
      resident.set(index, {
        layer,
        bytes: bitmap.width * bitmap.height * BYTES_PER_PIXEL,
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
        if (resident.has(index)) continue;
        const inFlight = pending.get(index);
        if (inFlight !== undefined) {
          requests.push(inFlight);
          continue;
        }
        requests.push(request(index, takeLayer()));
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
      return { resident: resident.size, bytes, pending: pending.size };
    },
  };
}
