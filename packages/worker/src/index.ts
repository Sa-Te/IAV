import {
  IDLE,
  makeThumbnail,
  recoverPersistedJob,
  runIngest,
  THUMBNAIL_MAX_EDGE,
  type IngestJob,
  type IngestSink,
  type ThumbnailEncoder,
} from "@instavault/core";

import { browserThumbnailEncoder } from "./thumbnails.js";

/**
 * The worker side of the contract. It owns the work, never the DOM, and depends
 * only on the storage *port* — the concrete repository is injected by the entry
 * point (apps/web/src/workers/ingest.worker.ts), which is the composition root.
 */

export type IngestRequest =
  | { readonly type: "ingest"; readonly zip: ArrayBuffer }
  | { readonly type: "cancel" }
  | { readonly type: "recover" }
  | { readonly type: "clear" }
  | { readonly type: "thumbnail"; readonly path: string; readonly maxEdge?: number };

/** A stored thumbnail as the worker sees it (Blob crosses this boundary, not Idb). */
export interface ThumbnailRow {
  readonly path: string;
  readonly blob: Blob;
  readonly type: string;
  readonly width: number;
  readonly height: number;
  readonly sourceBytes: number;
}

export interface ThumbnailMediaStore {
  getMediaBlob(path: string): Promise<Blob | null>;
  getThumbnail(path: string): Promise<ThumbnailRow | null>;
  putThumbnail(thumbnail: ThumbnailRow): Promise<void>;
}

export type IngestResponse =
  | { readonly type: "ready" }
  | { readonly type: "job"; readonly job: IngestJob }
  | { readonly type: "error"; readonly message: string }
  | {
      readonly type: "thumbnail";
      readonly path: string;
      readonly thumbnail: ThumbnailRow | null;
      readonly reason: "missing" | "decode" | "video" | "unsupported" | null;
    };

export class IngestWorkerHost {
  private controller: AbortController | null = null;

  constructor(
    private readonly sink: IngestSink,
    private readonly post: (response: IngestResponse) => void,
    private readonly media: ThumbnailMediaStore | null = null,
    private readonly encode: ThumbnailEncoder<Blob> = browserThumbnailEncoder,
  ) {}

  /**
   * Announced by the composition root once the repository is open and this host
   * has installed its listener. Messages posted before that point can be lost —
   * which is why a thumbnail request used to wait out its whole deadline.
   */
  announceReady(): void {
    this.post({ type: "ready" });
  }

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

      case "thumbnail": {
        await this.handleThumbnail(request);
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

  /**
   * Lazily generate one grid thumbnail (AGENTS §7, D3): ingest never decodes
   * images, so this is the only place pixels are read for a list view.
   *
   * Video poster frames are NOT built in M9 (D4): `createImageBitmap` cannot decode
   * a video, so it would take a DOM <video> plus a canvas. A video tile keeps using
   * the original with `preload="metadata"` until M10.
   */
  private async handleThumbnail(request: {
    readonly path: string;
    readonly maxEdge?: number;
  }): Promise<void> {
    if (this.media === null) {
      this.post({ type: "thumbnail", path: request.path, thumbnail: null, reason: "unsupported" });
      return;
    }

    const existing = await this.media.getThumbnail(request.path);
    if (existing !== null) {
      this.post({ type: "thumbnail", path: request.path, thumbnail: existing, reason: null });
      return;
    }

    const blob = await this.media.getMediaBlob(request.path);
    if (blob === null) {
      this.post({ type: "thumbnail", path: request.path, thumbnail: null, reason: "missing" });
      return;
    }

    if (blob.type.startsWith("video/") || blob.type.startsWith("audio/")) {
      this.post({ type: "thumbnail", path: request.path, thumbnail: null, reason: "video" });
      return;
    }

    const made = await makeThumbnail(blob, this.encode, request.maxEdge ?? THUMBNAIL_MAX_EDGE);
    if (made === null) {
      this.post({ type: "thumbnail", path: request.path, thumbnail: null, reason: "decode" });
      return;
    }

    const row: ThumbnailRow = {
      path: request.path,
      blob: made.blob,
      type: made.type,
      width: made.width,
      height: made.height,
      sourceBytes: blob.size,
    };
    await this.media.putThumbnail(row);
    this.post({ type: "thumbnail", path: request.path, thumbnail: row, reason: null });
  }
}
