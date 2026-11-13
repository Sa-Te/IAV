/**
 * A still frame for a video, produced once and remembered.
 *
 * A `<video preload="metadata">` paints nothing until a frame is decoded, so every
 * video tile was a black rectangle (M18 report). The poster is drawn on the main
 * thread — a worker has no `<video>` — then handed to the existing thumbnail
 * store under a `poster:` prefix, so the cache and the LRU are the ones that
 * already exist (D6: no second thumbnail system).
 *
 * Failure is a state, not silence: a decode error or the 10 s media deadline
 * (AGENTS.md §7) resolves `null`, and the tile says "poster" rather than showing
 * black.
 */

export const POSTER_PREFIX = "poster:";
export const POSTER_EDGE = 256;
export const POSTER_TIMEOUT_MS = 10_000;

const generated = new Map<string, Promise<Blob | null>>();

/**
 * Four decodes at a time. The cyclone asks for a whole window at once, and a
 * hundred hidden <video> elements is a worse stall than a late poster.
 */
const MAX_IN_FLIGHT = 4;
let inFlight = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(work: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_IN_FLIGHT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  inFlight += 1;
  try {
    return await work();
  } finally {
    inFlight -= 1;
    waiting.shift()?.();
  }
}

/** A hidden video, seeked just past the first frame, drawn once. */
async function drawPoster(blob: Blob, signal: AbortSignal): Promise<Blob | null> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  video.style.position = "absolute";
  video.style.opacity = "0";
  video.style.pointerEvents = "none";
  document.body.append(video);

  try {
    await new Promise<void>((resolve, reject) => {
      const stop = () => {
        signal.removeEventListener("abort", onAbort);
        reject(new Error("poster aborted"));
      };
      const onAbort = () => stop();
      signal.addEventListener("abort", onAbort);
      video.addEventListener("loadeddata", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("poster decode failed")), {
        once: true,
      });
    });

    // A tenth of the clip, or 0.1 s: far enough in that the first frame is
    // decoded, early enough that it is the clip's own opening shot.
    video.currentTime = Math.min(0.1, (video.duration || 1) / 10);
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("seeked", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("poster seek failed")), {
        once: true,
      });
    });

    const scale = Math.min(1, POSTER_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (context === null) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), "image/webp", 0.8),
    );
  } finally {
    URL.revokeObjectURL(url);
    video.remove();
  }
}

export interface PosterStore {
  get(path: string): Promise<Blob | null>;
  put(path: string, blob: Blob): Promise<void>;
}

/**
 * The poster for one video blob: from the store, or generated and stored once.
 * Keyed by path so two tiles for the same clip share one decode.
 */
export function requestPoster(path: string, blob: Blob, store: PosterStore): Promise<Blob | null> {
  const key = `${POSTER_PREFIX}${path}`;
  const existing = generated.get(key);
  if (existing !== undefined) return existing;

  const work = (async () => {
    const stored = await store.get(key);
    if (stored !== null) return stored;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), POSTER_TIMEOUT_MS);
    try {
      const poster = await withSlot(() => drawPoster(blob, controller.signal));
      if (poster !== null) await store.put(key, poster);
      return poster;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  })();

  generated.set(key, work);
  // A failed poster must be retried on a later visit, not cached forever.
  void work.then((result) => {
    if (result === null) generated.delete(key);
  });
  return work;
}

export function clearPosterCache(): void {
  generated.clear();
}
