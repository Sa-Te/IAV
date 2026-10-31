import {
  IDLE,
  recoverPersistedJob,
  runIngest,
  type IngestJob,
  type IngestSink,
} from "@instavault/core";

/**
 * The worker side of the contract. It owns the work, never the DOM, and depends
 * only on the storage *port* — the concrete repository is injected by the entry
 * point (apps/web/src/workers/ingest.worker.ts), which is the composition root.
 */

export type IngestRequest =
  | { readonly type: "ingest"; readonly zip: ArrayBuffer }
  | { readonly type: "cancel" }
  | { readonly type: "recover" }
  | { readonly type: "clear" };

export type IngestResponse =
  | { readonly type: "job"; readonly job: IngestJob }
  | { readonly type: "error"; readonly message: string };

export class IngestWorkerHost {
  private controller: AbortController | null = null;

  constructor(
    private readonly sink: IngestSink,
    private readonly post: (response: IngestResponse) => void,
  ) {}

  get isRunning(): boolean {
    return this.controller !== null;
  }

  async handle(request: IngestRequest): Promise<void> {
    switch (request.type) {
      case "recover": {
        const persisted = await this.sink.readJob();
        const job = recoverPersistedJob(persisted);
        // Rewrite the persisted row so a reload does not re-report the same interruption.
        if (persisted?.status === "parsing") {
          await this.sink.writeJob(job);
        }
        this.post({ type: "job", job });
        return;
      }

      case "cancel": {
        this.controller?.abort();
        return;
      }

      case "clear": {
        await this.sink.clear();
        this.post({ type: "job", job: IDLE });
        return;
      }

      case "ingest": {
        if (this.controller !== null) return;
        const controller = new AbortController();
        this.controller = controller;
        try {
          const job = await runIngest({
            zip: new Uint8Array(request.zip),
            sink: this.sink,
            signal: controller.signal,
            onProgress: (progress) => this.post({ type: "job", job: progress }),
          });
          this.post({ type: "job", job });
        } catch (error) {
          this.post({
            type: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        } finally {
          this.controller = null;
        }
      }
    }
  }
}
