// @vitest-environment jsdom
import type { ArchiveRow, CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearMediaRequestCache } from "../media/useMediaUrl.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { Gallery } from "./Gallery.js";

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });

const POSTS: CategoryRecord = {
  id: "posts",
  resolvedTier: 1,
  entryCount: 3,
  data: [
    {
      media: [{ uri: "media/posts/a.jpg", title: "first caption", creation_timestamp: 1700000000 }],
    },
    { media: [{ uri: "media/posts/b.jpg", title: "", creation_timestamp: 1700000100 }] },
    {
      media: [{ uri: "media/posts/c.jpg", title: "third caption", creation_timestamp: 1700000200 }],
    },
  ],
  warnings: [],
};

const SUMMARY: ArchiveRow = {
  id: "current",
  fingerprint: "fmt-test1",
  importedAt: "2026-10-31T00:00:00.000Z",
  sourceBytes: 10,
  counts: {
    categories: 1,
    entries: 3,
    mediaStored: 3,
    mediaMissing: 0,
    mediaOrphans: 0,
    unrecognised: 0,
  },
  drift: null,
  job: { status: "idle" },
};

function repository(overrides: Partial<ArchiveRepository> = {}): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    getMediaBlob: async () => JPEG,
    getCategory: async () => POSTS,
    summary: async () => SUMMARY,
    ...overrides,
  };
}

function renderGallery(repo: ArchiveRepository): void {
  render(
    <RepositoryProvider repository={repo}>
      <Gallery />
    </RepositoryProvider>,
  );
}

beforeEach(() => {
  clearMediaRequestCache();
  URL.createObjectURL = vi.fn(() => "blob:tile");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Gallery", () => {
  it("renders the summary line", async () => {
    renderGallery(repository());
    expect(await screen.findAllByRole("button", { name: /caption|Open post/ })).toHaveLength(3);
    expect(screen.getByText(/3 posts · 3 media files/)).toBeTruthy();
  });

  it("renders three visibly distinct tile states", async () => {
    let resolveSlow: ((blob: Blob) => void) | undefined;
    const slow = new Promise<Blob>((resolve) => {
      resolveSlow = resolve;
    });

    const repo = repository({
      getMediaBlob: async (id: string) => {
        if (id === "media/posts/a.jpg") return JPEG;
        if (id === "media/posts/b.jpg") return slow;
        return null;
      },
    });

    renderGallery(repo);

    // failed tile: names its reason
    expect(await screen.findByText("File missing")).toBeTruthy();
    // ready tile: an image with the caption as alt text
    await waitFor(() => expect(screen.getByAltText("first caption")).toBeTruthy());
    // pending tile: no image, no failure text, just the skeleton
    expect(document.querySelectorAll(".tile-pending")).toHaveLength(1);

    resolveSlow?.(JPEG);
    await waitFor(() => expect(document.querySelectorAll(".tile-pending")).toHaveLength(0));
  });

  it("distinguishes an empty archive from a failed read", async () => {
    const { unmount } = render(
      <RepositoryProvider
        repository={repository({
          getCategory: async () => ({ ...POSTS, data: [], entryCount: 0 }),
        })}
      >
        <Gallery />
      </RepositoryProvider>,
    );
    expect(await screen.findByText("This archive has no posts.")).toBeTruthy();
    unmount();

    renderGallery(
      repository({
        getCategory: async () => {
          throw new Error("boom");
        },
      }),
    );
    expect(await screen.findByText("Could not read the archive.")).toBeTruthy();
    expect(screen.queryByText("This archive has no posts.")).toBeNull();
  });

  it("opens the detail view from the keyboard and returns focus on Escape", async () => {
    const user = userEvent.setup();
    renderGallery(repository());

    const tile = await screen.findByRole("button", { name: "first caption" });
    tile.focus();
    expect(document.activeElement).toBe(tile);

    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(screen.getByText("first caption")).toBeTruthy();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(tile);

    // The detail's media unmounted with the dialog, so its object URL was revoked.
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
