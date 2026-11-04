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

/**
 * How many decodes may run at once. 405 tiles becoming visible together used to
 * open 405 reads and decodes at the same instant; eight is enough to keep the
 * main thread responsive, and the queue is FIFO so the order is the request order.
 */
export const MAX_CONCURRENT_LOADS = 8;

/**
 * No request may be pending without a deadline (AGENTS §7). This is the backstop
 * for a loader that never settles at all, so it is deliberately longer than the
 * worker's own 10-second deadline: the thumbnail times out first, the original
 * blob answers, and a working tile is never failed by the backstop. On expiry the
 * entry becomes `failed: "timeout"` — a terminal state, never a fourth state.
 */
export const MEDIA_REQUEST_DEADLINE_MS = 12_000;

/** A loader may throw this to say "nobody answered", distinct from "no blob". */
export class MediaTimeoutError extends Error {
  override readonly name = "MediaTimeoutError";
}

export interface MediaCacheRuntime<T extends MediaBytes> {
  createUrl(blob: T): string;
  revokeUrl(url: string): void;
  decode(blob: T): Promise<DecodedMedia>;
}

interface Trace {
  requestedAt: number | null;
  resolvedAt: number | null;
  evictedAt: number | null;
  timesRequested: number;
}

interface Entry {
  readonly path: string;
  /** Mounted consumers. An entry with refs > 0 must not be revoked under them. */
  refs: number;
  url: string | null;
  bitmap: DecodedBitmap | null;
  mime: string;
  bytes: number;
  lastUsed: number;
  failure: "missing" | "decode" | "timeout" | null;
}

export interface PathTimeline {
  readonly path: string;
  readonly requestedAt: number | null;
  readonly resolvedAt: number | null;
  readonly evictedAt: number | null;
  readonly timesRequested: number;
  readonly resident: boolean;
}

export interface MediaCache {
  getUrl(path: string): Promise<MediaState>;
  /** Per-path history, for /dev/media-audit. Survives eviction. */
  audit(): readonly PathTimeline[];
  /**
   * Like `getUrl`, but pins the entry until the matching `release(path)`.
   *
   * A mounted tile holds its URL; evicting it would revoke a URL still on screen,
   * which the browser renders as nothing at all — the blank-tile bug of M12. A
   * pinned entry is skipped by eviction, so the cap can be exceeded by the number
   * of live tiles (tens) and never by the archive (hundreds).
   */
  retain(path: string): Promise<MediaState>;
  release(path: string): void;
  getBitmap(path: string): Promise<DecodedBitmap | null>;
  /** Entries currently held, failures included. */
  size(): number;
  releaseAll(): void;
}

export function createMediaCache<T extends MediaBytes>(
  load: (path: string) => Promise<T | null>,
  runtime: MediaCacheRuntime<T>,
  capacity: number = MEDIA_CACHE_CAP,
  deadlineMs: number = MEDIA_REQUEST_DEADLINE_MS,
): MediaCache {
  const entries = new Map<string, Entry>();
  const inflight = new Map<string, Promise<Entry>>();
  // Consumers that have asked for a path but not yet received an entry. An eviction
  // during this window would hand back a URL that is already revoked, which the
  // browser paints as nothing — the top-of-grid tiles that never loaded.
  const reservations = new Map<string, number>();
  const traces = new Map<string, Trace>();
  let clock = 0;

  let active = 0;
  const queue: (() => void)[] = [];

  /** FIFO admission with a hard concurrency cap (MAX_CONCURRENT_LOADS). */
  const admitted = <R>(work: () => Promise<R>): Promise<R> =>
    new Promise<R>((resolve, reject) => {
      const start = () => {
        active += 1;
        void work()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            queue.shift()?.();
          });
      };
      if (active < MAX_CONCURRENT_LOADS) start();
      else queue.push(start);
    });

  const traceOf = (path: string): Trace => {
    const existing = traces.get(path);
    if (existing !== undefined) return existing;
    const fresh: Trace = {
      requestedAt: null,
      resolvedAt: null,
      evictedAt: null,
      timesRequested: 0,
    };
    traces.set(path, fresh);
    return fresh;
  };

  const evictIfNeeded = (keep: string): void => {
    while (entries.size > capacity) {
      let oldestPath: string | null = null;
      let oldest = Infinity;
      for (const [path, entry] of entries) {
        // A pinned entry is on screen right now, and a reserved one has a consumer
        // waiting for it: revoking either would blank or hang a tile.
        if (path === keep || entry.refs > 0 || (reservations.get(path) ?? 0) > 0) continue;
        if (entry.lastUsed < oldest) {
          oldest = entry.lastUsed;
          oldestPath = path;
        }
      }
      // Everything left is pinned: stay over the cap rather than blank a tile.
      // Live tiles are tens, the archive is hundreds, so the ceiling is still real.
      if (oldestPath === null) return;
      const doomed = entries.get(oldestPath);
      entries.delete(oldestPath);
      if (doomed !== undefined) release(doomed);
      traceOf(oldestPath).evictedAt = Date.now();
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

    traceOf(path).timesRequested += 1;
    traceOf(path).requestedAt = Date.now();

    const promise = (async (): Promise<Entry> => {
      // One attempt, one deadline, one terminal state. A loader that hangs — the
      // worker never replying — must not become a permanent skeleton.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), deadlineMs);
      });
      let blob: T | null | "timeout";
      try {
        blob = await Promise.race([admitted(() => load(path)), deadline]);
      } catch (error) {
        if (error instanceof MediaTimeoutError) blob = "timeout";
        else throw error;
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }

      if (blob === "timeout") {
        return {
          path,
          refs: 0,
          url: null,
          bitmap: null,
          mime: "",
          bytes: 0,
          lastUsed: (clock += 1),
          failure: "timeout",
        };
      }
      if (blob === null) {
        return {
          path,
          refs: 0,
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
          refs: 0,
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
        refs: 0,
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
      reservations.set(path, (reservations.get(path) ?? 0) + 1);
      let entry: Entry;
      try {
        entry = await ensure(path);
      } finally {
        const left = (reservations.get(path) ?? 1) - 1;
        if (left <= 0) reservations.delete(path);
        else reservations.set(path, left);
      }
      if (entry.failure !== null) return { status: "failed", reason: entry.failure };
      if (entry.url === null) return { status: "failed", reason: "decode" };
      return { status: "ready", url: entry.url, mime: entry.mime, bitmap: entry.bitmap };
    },

    async retain(path) {
      reservations.set(path, (reservations.get(path) ?? 0) + 1);
      let entry: Entry;
      try {
        entry = await ensure(path);
      } finally {
        const left = (reservations.get(path) ?? 1) - 1;
        if (left <= 0) reservations.delete(path);
        else reservations.set(path, left);
      }
      entry.refs += 1;
      if (entry.failure !== null) return { status: "failed", reason: entry.failure };
      if (entry.url === null) return { status: "failed", reason: "decode" };
      return { status: "ready", url: entry.url, mime: entry.mime, bitmap: entry.bitmap };
    },

    release(path) {
      const entry = entries.get(path);
      if (entry !== undefined && entry.refs > 0) entry.refs -= 1;
    },

    async getBitmap(path) {
      const entry = await ensure(path);
      return entry.bitmap;
    },

    audit() {
      return [...traces.entries()]
        .map(([path, trace]) => ({
          path,
          requestedAt: trace.requestedAt,
          resolvedAt: trace.resolvedAt,
          evictedAt: trace.evictedAt,
          timesRequested: trace.timesRequested,
          resident: entries.has(path),
        }))
        .sort((a, b) => (a.requestedAt ?? 0) - (b.requestedAt ?? 0));
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
