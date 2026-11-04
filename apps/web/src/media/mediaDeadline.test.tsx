// @vitest-environment jsdom
import type { MediaItemView } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaCachesProvider } from "./MediaCaches.js";
import { MediaGrid } from "./MediaGrid.js";
import type { ThumbnailResult } from "./thumbnailWorker.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";

/**
 * Every media request must settle in bounded time. Fake timers, and a worker that
 * is entirely under the test's control: "never replies" is a state we can hold,
 * which is the only way to test a hang.
 */

const DEADLINE = 10_000;

let notices = 0;
let requestResult: (path: string) => Promise<ThumbnailResult>;
const unavailableListeners = new Set<() => void>();
const notifyUnavailable = (): void => {
  for (const listener of unavailableListeners) listener();
};

type ThumbnailModule = {
  THUMBNAIL_DEADLINE_MS: number;
  thumbnailsUnavailable: () => boolean;
};

vi.mock("./thumbnailWorker.js", async () => {
  const actual = await vi.importActual<ThumbnailModule>("./thumbnailWorker.js");
  return {
    ...actual,
    requestThumbnail: (path: string) => requestResult(path),
    thumbnailsUnavailable: () => false,
    onThumbnailsUnavailable: (listener: () => void) => {
      unavailableListeners.add(listener);
      return () => {
        unavailableListeners.delete(listener);
      };
    },
  };
});

/** Resolves with `status` after the real deadline, using fake timers. */
function afterDeadline(status: ThumbnailResult["status"]): Promise<ThumbnailResult> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ status } as ThumbnailResult), DEADLINE);
  });
}

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });
const ITEMS: readonly MediaItemView[] = [
  { id: "media/posts/0.jpg", caption: "zero", takenAt: 0, category: "posts" },
  { id: "media/posts/1.jpg", caption: "one", takenAt: 1, category: "posts" },
];

function repository(blob: (path: string) => Promise<Blob | null>): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [],
    getMediaBlob: blob,
    getCategory: async () => null,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

function renderGrid(repo: ArchiveRepository, items = ITEMS): void {
  render(
    <RepositoryProvider repository={repo}>
      <MediaCachesProvider>
        <MediaGrid items={items} source={repo} onOpen={() => undefined} />
      </MediaCachesProvider>
    </RepositoryProvider>,
  );
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function tileState(name: RegExp): string | null {
  return screen.getByRole("button", { name }).getAttribute("data-media-state");
}

beforeEach(() => {
  vi.useFakeTimers();
  notices = 0;
  unavailableListeners.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("G1 — the worker never replies", () => {
  it("settles as failed:timeout at the deadline, not one tick earlier and never later", async () => {
    requestResult = () => afterDeadline("timeout");
    renderGrid(repository(async () => null));
    await flush();

    expect(tileState(/zero/)).not.toBe("failed");

    await act(async () => {
      vi.advanceTimersByTime(DEADLINE - 1);
    });
    await flush();
    expect(tileState(/zero/)).toBe("pending");

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    await flush();

    expect(tileState(/zero/)).toBe("failed");
    expect(
      screen.getByRole("button", { name: /zero — timed out/i }).getAttribute("data-media-reason"),
    ).toBe("timed out");
  });
});

describe("G2 — a thumbnail is an optimisation", () => {
  it("falls back to the original blob when the thumbnail times out", async () => {
    requestResult = () => afterDeadline("timeout");
    const blobs: string[] = [];
    renderGrid(
      repository(async (path) => {
        blobs.push(path);
        return JPEG;
      }),
      [ITEMS[0] as MediaItemView],
    );
    await flush();

    expect(blobs).toEqual([]); // nothing original was read yet

    await act(async () => {
      vi.advanceTimersByTime(DEADLINE);
    });
    await flush();

    // The fallback happened — the original blob was read after the timeout.
    expect(blobs).toEqual(["media/posts/0.jpg"]);
    expect(tileState(/zero/)).toBe("ready");
    expect(screen.getByRole("button", { name: /zero/ }).querySelector("img")).not.toBeNull();
  });

  it("reports missing when there is no blob at all", async () => {
    requestResult = async () => ({ status: "empty" });
    renderGrid(
      repository(async () => null),
      [ITEMS[0] as MediaItemView],
    );
    await flush();

    expect(tileState(/zero/)).toBe("failed");
    expect(
      screen.getByRole("button", { name: /zero — not stored/i }).getAttribute("data-media-reason"),
    ).toBe("not stored");
  });
});

describe("G3 — a worker that cannot start is announced once", () => {
  it("keeps every tile working from originals and notifies a single time", async () => {
    let announced = false;
    requestResult = async () => {
      // Emulate the module's markUnavailable: listeners fire once, not per tile.
      if (!announced) {
        announced = true;
        notifyUnavailable();
      }
      return { status: "unavailable" };
    };

    const { onThumbnailsUnavailable } = await import("./thumbnailWorker.js");
    const stop = onThumbnailsUnavailable(() => {
      notices += 1;
    });

    renderGrid(repository(async () => JPEG));
    await flush();

    expect(notices).toBe(1);
    expect(tileState(/zero/)).toBe("ready");
    expect(tileState(/one/)).toBe("ready");
    expect(screen.getAllByText(/Thumbnail generation is unavailable/)).toHaveLength(1);
    stop();
  });
});

describe("G4 — no tile is pending after the deadline", () => {
  it("settles everything even when nothing answers at all", async () => {
    requestResult = () => new Promise<ThumbnailResult>(() => undefined); // never settles
    renderGrid(repository(() => new Promise<Blob | null>(() => undefined)));
    await flush();

    // The backstop is 12s (worker deadline 10s + room for the fallback).
    await act(async () => {
      vi.advanceTimersByTime(12_000);
    });
    await flush();

    const pending = document.querySelectorAll('[data-media-state="pending"]');
    expect(pending.length).toBe(0);
  });
});
