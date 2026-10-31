import { thumbnailDimensions } from "./thumbnail.js";
import type { DecodedBitmap, DecodedMedia, MediaBytes, MediaState } from "./state.js";

/**
 * A bounded media cache with explicit release.
 *
 * Why it exists: an object URL is a leak until it is revoked, and a decoded
 * bitmap is memory until it is closed. A grid of 405 tiles that each revoke on
 * unmount still re-reads and re-decodes the same photo every time it scrolls
 * back into view. One entry per path, one in-flight decode per path, and a cap
 * with a real eviction path is the smallest design that is both fast and honest
 * about memory.
 *
 * Cap: 150 entries. That is ~2.7 screens of a 10-column grid at 1920px (about 55
 * tiles) with room for a detail view and the row above/below; it is also small
 * enough that 405 media do not all stay resident. It is a count, not a byte
 * budget, because a byte budget needs a decoder to report sizes we do not need
 * yet — `ponytail:` upgrade to bytes when a 4K video is the thing that hurts.
 *
 * No module-level singleton: the app creates one cache per root and passes it
 * down, so tests never share state and two archives cannot collide.
 */

export const MEDIA_CACHE_CAP = 150;

export interface MediaCacheRuntime<T extends MediaBytes> {
  createUrl(blob: T): string;
  revokeUrl(url: string): void;
  decode(blob: T): Promise<DecodedMedia>;
}

interface Entry {
  readonly path: string;
  url: string | null;
  bitmap: DecodedBitmap | null;
  mime: string;
  bytes: number;
  lastUsed: number;
  failure: "missing" | "decode" | null;
}

export interface MediaCache {
  getUrl(path: string): Promise<MediaState>;
  getBitmap(path: string): Promise<DecodedBitmap | null>;
  /** Entries currently held, failures included. */
  size(): number;
  releaseAll(): void;
}

export function createMediaCache<T extends MediaBytes>(
  load: (path: string) => Promise<T | null>,
  runtime: MediaCacheRuntime<T>,
  capacity: number = MEDIA_CACHE_CAP,
): MediaCache {
  const entries = new Map<string, Entry>();
  const inflight = new Map<string, Promise<Entry>>();
  let clock = 0;

  const evictIfNeeded = (keep: string): void => {
    while (entries.size > capacity) {
      let oldestPath: string | null = null;
      let oldest = Infinity;
      for (const [path, entry] of entries) {
        if (path !== keep && entry.lastUsed < oldest) {
          oldest = entry.lastUsed;
          oldestPath = path;
        }
      }
      if (oldestPath === null) return;
      const doomed = entries.get(oldestPath);
      entries.delete(oldestPath);
      if (doomed !== undefined) release(doomed);
    }
  };

  const release = (entry: Entry): void => {
    // Order matters: revoke the URL first (the string outlives the bitmap), then
    // free the pixels. Tested with a recorder, not asserted by inspection.
    if (entry.url !== null) runtime.revokeUrl(entry.url);
    if (entry.bitmap !== null) entry.bitmap.close();
    entry.url = null;
    entry.bitmap = null;
  };

  const ensure = (path: string): Promise<Entry> => {
    const existing = entries.get(path);
    if (existing !== undefined) {
      existing.lastUsed = clock += 1;
      return Promise.resolve(existing);
    }

    const pending = inflight.get(path);
    if (pending !== undefined) return pending;

    const promise = (async (): Promise<Entry> => {
      const blob = await load(path);
      if (blob === null) {
        return {
          path,
          url: null,
          bitmap: null,
          mime: "",
          bytes: 0,
          lastUsed: (clock += 1),
          failure: "missing",
        };
      }

      const decoded = await runtime.decode(blob);
      if (!decoded.ok) {
        return {
          path,
          url: null,
          bitmap: null,
          mime: blob.type,
          bytes: blob.size,
          lastUsed: (clock += 1),
          failure: "decode",
        };
      }

      return {
        path,
        url: runtime.createUrl(blob),
        bitmap: decoded.bitmap,
        mime: blob.type,
        bytes: blob.size,
        lastUsed: (clock += 1),
        failure: null,
      };
    })();

    inflight.set(path, promise);
    return promise
      .finally(() => inflight.delete(path))
      .then((entry) => {
        entries.set(path, entry);
        evictIfNeeded(path);
        return entry;
      });
  };

  return {
    async getUrl(path) {
      const entry = await ensure(path);
      if (entry.failure !== null) return { status: "failed", reason: entry.failure };
      if (entry.url === null) return { status: "failed", reason: "decode" };
      return { status: "ready", url: entry.url, mime: entry.mime, bitmap: entry.bitmap };
    },

    async getBitmap(path) {
      const entry = await ensure(path);
      return entry.bitmap;
    },

    size() {
      return entries.size;
    },

    releaseAll() {
      for (const entry of entries.values()) release(entry);
      entries.clear();
      inflight.clear();
    },
  };
}

/** Re-exported so callers computing a thumbnail size have one constant. */
export { thumbnailDimensions };
