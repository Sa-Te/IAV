import { createLocalArchiveRepository } from "@instavault/storage";
import { IngestWorkerHost, type IngestRequest } from "@instavault/worker";

/**
 * Composition root for the ingest worker. It is the one place that knows both
 * the concrete storage adapter and the worker host; everything below depends on
 * interfaces only (AGENTS.md §2).
 *
 * The listener is installed **synchronously**, before the repository opens. A
 * module worker with a top-level `await` starts its event loop while the module
 * is still loading, so a message posted in that window is dispatched to nobody
 * and lost — measured here at 3 hung imports in 6 (the page sits at
 * "reading 0 / 0" forever). Promises keep the order: every request waits for the
 * host, in arrival order.
 */
const scope = self as unknown as {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
};

// The repository is also the worker's media store: without it every thumbnail
// request is answered "unsupported" and the grid silently falls back to decoding
// full-size originals on the main thread.
const host = createLocalArchiveRepository().then(
  (repository) =>
    new IngestWorkerHost(repository, (response) => scope.postMessage(response), repository),
);

scope.addEventListener("message", (event) => {
  const request = event.data as IngestRequest;
  void host.then((ready) => ready.handle(request));
});

void host.then((ready) => ready.announceReady());
