import { createLocalArchiveRepository } from "@instavault/storage";
import { IngestWorkerHost, type IngestRequest } from "@instavault/worker";

throw new Error("e2e drill: the ingest worker refused to start");

/**
 * Composition root for the ingest worker. It is the one place that knows both
 * the concrete storage adapter and the worker host; everything below depends on
 * interfaces only (AGENTS.md §2).
 */
const scope = self as unknown as {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
};

const repository = await createLocalArchiveRepository();
// The repository is also the worker's media store: without it every thumbnail
// request is answered "unsupported" and the grid silently falls back to decoding
// full-size originals on the main thread.
const host = new IngestWorkerHost(
  repository,
  (response) => scope.postMessage(response),
  repository,
);

scope.addEventListener("message", (event) => {
  void host.handle(event.data as IngestRequest);
});

host.announceReady();
