// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  onThumbnailsUnavailable,
  requestThumbnail,
  resetThumbnailWorker,
  THUMBNAIL_DEADLINE_MS,
} from "./thumbnailWorker.js";

/**
 * The module's own deadline, tested without the media cache: a worker that takes
 * the message and never answers must not leave a caller waiting for ever.
 */

class SilentWorker {
  static instances: SilentWorker[] = [];
  readonly posted: unknown[] = [];
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor() {
    SilentWorker.instances.push(this);
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  terminate(): void {}
}

beforeEach(() => {
  vi.useFakeTimers();
  SilentWorker.instances = [];
  vi.stubGlobal("Worker", SilentWorker);
  resetThumbnailWorker();
});

afterEach(() => {
  resetThumbnailWorker();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("worker deadline", () => {
  it("settles as timeout exactly at the deadline, not before", async () => {
    let settled: string | null = null;
    void requestThumbnail("media/posts/a.jpg").then((result) => {
      settled = result.status;
    });

    expect(SilentWorker.instances[0]?.posted).toEqual([
      { type: "thumbnail", path: "media/posts/a.jpg" },
    ]);

    await vi.advanceTimersByTimeAsync(THUMBNAIL_DEADLINE_MS - 1);
    expect(settled).toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe("timeout");
  });

  it("reports unavailable once when the worker cannot be constructed", async () => {
    vi.stubGlobal(
      "Worker",
      class {
        constructor() {
          throw new Error("blocked by policy");
        }
      },
    );
    resetThumbnailWorker();

    let notices = 0;
    const stop = onThumbnailsUnavailable(() => {
      notices += 1;
    });

    const first = await requestThumbnail("a.jpg");
    const second = await requestThumbnail("b.jpg");

    expect(first.status).toBe("unavailable");
    expect(second.status).toBe("unavailable");
    expect(notices).toBe(1);
    stop();
  });
});
