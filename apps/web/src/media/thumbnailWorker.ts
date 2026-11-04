import type { IngestRequest, IngestResponse } from "@instavault/worker";

/**
 * Main-thread client for the worker's `thumbnail` request.
 *
 * The M14 defect: a request that never got a reply stayed pending forever, and a
 * pending cache entry is a permanent skeleton. Every request now carries a
 * deadline and every answer is typed, so "no reply" is a result rather than a
 * hang. The worker is started lazily; a construction failure is remembered once
 * and every tile falls back to original blobs afterwards.
 */

/**
 * Ten seconds: enough for a cold worker boot plus a 12MP decode on a slow laptop,
 * short enough that a tile that will never show an image says so.
 */
export const THUMBNAIL_DEADLINE_MS = 10_000;

export type ThumbnailResult =
  | { readonly status: "blob"; readonly blob: Blob }
  /** The worker answered "no thumbnail for this path" (video, decode refused). */
  | { readonly status: "empty" }
  /** The worker did not answer within the deadline. */
  | { readonly status: "timeout" }
  /** No worker exists, or it failed to start. Thumbnails are off for this session. */
  | { readonly status: "unavailable" };

let worker: Worker | null = null;
let ready = false;
let unavailable = false;
let announced = false;
const pending = new Map<string, { resolve: (result: ThumbnailResult) => void; timer: number }>();
const listeners = new Set<() => void>();
/** Requests made before the worker announced itself; posted once it is ready. */
const waitingForReady = new Map<string, IngestRequest>();

function markUnavailable(): void {
  unavailable = true;
  for (const [path, entry] of pending) {
    clearTimeout(entry.timer);
    pending.delete(path);
    entry.resolve({ status: "unavailable" });
  }
  if (!announced) {
    announced = true;
    // Once per page session, not once per tile.
    for (const listener of listeners) listener();
  }
}

function ensureWorker(): Worker | null {
  if (unavailable) return null;
  if (typeof Worker === "undefined") {
    markUnavailable();
    return null;
  }
  if (worker !== null) return worker;

  try {
    worker = new Worker(new URL("../workers/ingest.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    markUnavailable();
    return null;
  }

  worker.addEventListener("message", (event: MessageEvent<IngestResponse>) => {
    const response = event.data;
    if (response.type === "ready") {
      ready = true;
      for (const request of waitingForReady.values()) worker?.postMessage(request);
      waitingForReady.clear();
      return;
    }
    if (response.type !== "thumbnail") return;
    const entry = pending.get(response.path);
    if (entry === undefined) return;
    clearTimeout(entry.timer);
    pending.delete(response.path);
    entry.resolve(
      response.thumbnail === null
        ? { status: "empty" }
        : { status: "blob", blob: response.thumbnail.blob },
    );
  });

  worker.addEventListener("error", () => {
    markUnavailable();
    worker?.terminate();
    worker = null;
  });

  return worker;
}

export function requestThumbnail(path: string): Promise<ThumbnailResult> {
  const target = ensureWorker();
  if (target === null) return Promise.resolve({ status: "unavailable" });

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      pending.delete(path);
      resolve({ status: "timeout" });
    }, THUMBNAIL_DEADLINE_MS);

    pending.set(path, { resolve, timer });
    const request: IngestRequest = { type: "thumbnail", path };
    // The worker opens IndexedDB before it listens; a message posted in that
    // window is lost, and the caller would wait out the whole deadline.
    if (ready) target.postMessage(request);
    else waitingForReady.set(path, request);
  });
}

export function thumbnailsUnavailable(): boolean {
  return unavailable;
}

/** Fires at most once per page session. Returns an unsubscribe. */
export function onThumbnailsUnavailable(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test hook: forget the worker between tests. */
export function resetThumbnailWorker(): void {
  for (const entry of pending.values()) clearTimeout(entry.timer);
  pending.clear();
  worker?.terminate();
  worker = null;
  ready = false;
  unavailable = false;
  announced = false;
  waitingForReady.clear();
}
