// @vitest-environment jsdom
import type { CategoryRecord, MediaItemView } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MediaCachesProvider } from "./MediaCaches.js";
import { MediaGrid } from "./MediaGrid.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";

/**
 * The gap that let M12's blank tiles through: every media test used a fake
 * repository where every blob existed. These two tests are the paths a fake
 * repository lies about by omission — absent blob, and a URL the browser refuses.
 */

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });

const RECORD: CategoryRecord = {
  id: "posts",
  resolvedTier: 1,
  entryCount: 3,
  data: [
    {
      media: [
        { uri: "media/posts/0.jpg", title: "post zero", creation_timestamp: 0 },
        { uri: "media/posts/1.jpg", title: "post one", creation_timestamp: 1 },
        { uri: "media/posts/2.jpg", title: "post two", creation_timestamp: 2 },
      ],
    },
  ],
  sources: [{ path: "posts_1.json", entryCount: 3, kind: "array" }],
  warnings: [],
};

const ITEMS: readonly MediaItemView[] = [
  { id: "media/posts/0.jpg", caption: "post zero", takenAt: 0, category: "posts" },
  { id: "media/posts/1.jpg", caption: "post one", takenAt: 1, category: "posts" },
  { id: "media/posts/2.jpg", caption: "post two", takenAt: 2, category: "posts" },
];

function repository(missing: ReadonlySet<string>): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [RECORD],
    getMediaBlob: async (path) => (missing.has(path) ? null : JPEG),
    getCategory: async () => RECORD,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 1, categories: 1, media: 3, thumbs: 0 }),
  };
}

function renderGrid(missing: ReadonlySet<string>): void {
  const repo = repository(missing);
  render(
    <RepositoryProvider repository={repo}>
      <MediaCachesProvider>
        <MediaGrid items={ITEMS} source={repo} onOpen={() => undefined} />
      </MediaCachesProvider>
    </RepositoryProvider>,
  );
}

afterEach(cleanup);

describe("a tile whose blob is absent", () => {
  it("shows a failed surface with a reason, while its neighbours show images", async () => {
    renderGrid(new Set(["media/posts/1.jpg"]));

    const broken = await screen.findByRole("button", { name: /post one — not stored/i });
    expect(within(broken).getByText("Not stored")).toBeDefined();
    // The surface is the failed one, not a blank body.
    expect(broken.querySelector(".tile-failed")).not.toBeNull();
    expect(broken.querySelector("img")).toBeNull();

    // Neighbours are unaffected: a real image each.
    for (const name of [/post zero/i, /post two/i]) {
      const tile = screen.getByRole("button", { name });
      expect(tile.querySelector("img")).not.toBeNull();
    }
  });
});

describe("a tile whose URL the browser refuses", () => {
  it("turns a ready-but-unloadable image into the failed surface", async () => {
    renderGrid(new Set());

    // This is what a revoked object URL does: the element exists, the pixels do
    // not, and without an error listener the tile is silent. The effect that
    // attaches the listener runs after the URL arrives, so retry the dispatch
    // rather than racing it.
    await waitFor(() => {
      const image = screen.getByRole("button", { name: /post zero/i }).querySelector("img");
      if (image === null) throw new Error("image not ready yet");
      fireEvent.error(image);
      expect(screen.getByRole("button", { name: /post zero — cannot display/i })).toBeDefined();
    });

    const failed = screen.getByRole("button", { name: /post zero — cannot display/i });
    expect(within(failed).getByText("Cannot display")).toBeDefined();
  });
});
