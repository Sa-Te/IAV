import type { IngestRequest, IngestResponse } from "@instavault/worker";

/**
 * Main-thread client for the worker's `thumbnail` request.
 *
 * Deliberately tiny: one worker, one pending map, and a hard "not available"
 * answer when there is no `Worker` (Node/jsdom, or a browser that refused it).
 * A null means "no thumbnail, use the original" — never a failed tile.
 */

let worker: Worker | null = null;
const pending = new Map<string, (blob: Blob | null) => void>();

function ensureWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;
  if (worker !== null) return worker;

  worker = new Worker(new URL("../workers/ingest.worker.ts", import.meta.url), { type: "module" });
  worker.addEventListener("message", (event: MessageEvent<IngestResponse>) => {
    const response = event.data;
    if (response.type !== "thumbnail") return;
    const resolve = pending.get(response.path);
    pending.delete(response.path);
    resolve?.(response.thumbnail?.blob ?? null);
  });
  return worker;
}

export function requestThumbnail(path: string): Promise<Blob | null> {
  const target = ensureWorker();
  if (target === null) return Promise.resolve(null);

  return new Promise((resolve) => {
    pending.set(path, resolve);
    const request: IngestRequest = { type: "thumbnail", path };
    target.postMessage(request);
  });
}

/** Test hook: forget the worker between tests. */
export function resetThumbnailWorker(): void {
  pending.clear();
  worker?.terminate();
  worker = null;
}
