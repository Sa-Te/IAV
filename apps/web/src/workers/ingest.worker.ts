import { createLocalArchiveRepository } from "@instavault/storage";
import { IngestWorkerHost, type IngestRequest } from "@instavault/worker";

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
const host = new IngestWorkerHost(repository, (response) => scope.postMessage(response));

scope.addEventListener("message", (event) => {
  void host.handle(event.data as IngestRequest);
});
