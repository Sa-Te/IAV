// @vitest-environment jsdom
import type { MediaItemView } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaCachesProvider } from "./MediaCaches.js";
import { MediaTile } from "./MediaTile.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";

/**
 * A tile already on screen when the observer attaches must be requested
 * immediately. Browsers do deliver an initial callback for intersecting targets;
 * this fake proves our code acts on it rather than waiting for a scroll.
 */
class ImmediateObserver {
  static instances: ImmediateObserver[] = [];

  constructor(callback: IntersectionObserverCallback) {
    ImmediateObserver.instances.push(this);
    const entry = { isIntersecting: true } as IntersectionObserverEntry;
    callback([entry], this as unknown as IntersectionObserver);
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });
const ITEM: MediaItemView = { id: "media/posts/a.jpg", caption: "", takenAt: 0, category: "posts" };

let blobs = 0;
const repository: ArchiveRepository = {
  listMedia: async () => ({ items: [], nextCursor: null }),
  listCategories: async () => [],
  getMediaBlob: async () => {
    blobs += 1;
    return JPEG;
  },
  getCategory: async () => null,
  summary: async () => null,
  getThumbnail: async () => null,
  putThumbnail: async () => undefined,
  auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
};

beforeEach(() => {
  blobs = 0;
  ImmediateObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", ImmediateObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("a tile already in the viewport", () => {
  it("receives exactly one request when the observer attaches", async () => {
    render(
      <RepositoryProvider repository={repository}>
        <MediaCachesProvider>
          <MediaTile item={ITEM} source={repository} onOpen={() => undefined} />
        </MediaCachesProvider>
      </RepositoryProvider>,
    );

    await waitFor(() => expect(blobs).toBe(1));
    expect(blobs).toBe(1);
    expect(ImmediateObserver.instances).toHaveLength(1);
  });
});
