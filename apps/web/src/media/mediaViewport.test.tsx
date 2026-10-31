// @vitest-environment jsdom
import type { MediaItemView } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaCachesProvider } from "./MediaCaches.js";
import { MediaTile } from "./MediaTile.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });

/**
 * A fake IntersectionObserver: nothing intersects until the test says so, which is
 * exactly the property the lazy-loading rule depends on.
 */
class FakeObserver {
  static instances: FakeObserver[] = [];
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeObserver.instances.push(this);
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  intersect(): void {
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function repositoryWith(spies: { blobs: string[]; thumbs: string[] }): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [],
    getMediaBlob: async (path: string) => {
      spies.blobs.push(path);
      return JPEG;
    },
    getCategory: async () => null,
    summary: async () => null,
    getThumbnail: async (path: string) => {
      spies.thumbs.push(path);
      return null;
    },
    putThumbnail: async () => undefined,
  };
}

const ITEM: MediaItemView = { id: "media/posts/a.jpg", caption: "", takenAt: 0, category: "posts" };

beforeEach(() => {
  FakeObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderTile(repository: ArchiveRepository): void {
  render(
    <RepositoryProvider repository={repository}>
      <MediaCachesProvider>
        <MediaTile item={ITEM} source={repository} onOpen={() => undefined} />
      </MediaCachesProvider>
    </RepositoryProvider>,
  );
}

describe("grid tiles and the viewport", () => {
  it("requests nothing while the tile is outside the viewport", async () => {
    const spies = { blobs: [] as string[], thumbs: [] as string[] };
    renderTile(repositoryWith(spies));

    // Give any eager effect a chance to run, then assert nothing did.
    await Promise.resolve();
    expect(spies.thumbs).toEqual([]);
    expect(spies.blobs).toEqual([]);
  });

  it("requests the thumbnail exactly once when the tile crosses the threshold", async () => {
    const spies = { blobs: [] as string[], thumbs: [] as string[] };
    renderTile(repositoryWith(spies));

    FakeObserver.instances[0]?.intersect();

    await waitFor(() => expect(spies.thumbs).toEqual(["media/posts/a.jpg"]));
    // A thumbnail miss falls back to the original; still one request per source.
    await waitFor(() => expect(spies.blobs).toEqual(["media/posts/a.jpg"]));
  });
});
