// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CategoryGallery } from "./CategoryGallery.js";
import { GALLERY_VIEW_KEY } from "../media/useGalleryView.js";

const POSTS: CategoryRecord = {
  id: "posts",
  resolvedTier: 1,
  entryCount: 3,
  data: [
    {
      media: [
        { uri: "media/posts/a.jpg", title: "a post", creation_timestamp: 1683000000 },
        { uri: "media/posts/b.jpg", title: "", creation_timestamp: 1683100000 },
        { uri: "media/posts/c.jpg", title: "undated", creation_timestamp: 0 },
      ],
    },
  ],
  warnings: [],
};

function repository(): ArchiveRepository & { listCategories: ReturnType<typeof vi.fn> } {
  const listCategories = vi.fn(async () => [POSTS]);
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories,
    getMediaBlob: async () => null,
    getCategory: async () => POSTS,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

function renderGallery(source: ArchiveRepository): void {
  render(
    <MemoryRouter initialEntries={["/posts"]}>
      <RepositoryProvider repository={source}>
        <CategoryGallery category="posts" title="Posts" />
      </RepositoryProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("gallery Grid | Timeline", () => {
  it("defaults to Grid and switches to Timeline with the same media list", async () => {
    const user = userEvent.setup();
    const source = repository();
    renderGallery(source);

    expect(await screen.findByText("3 items")).toBeDefined();
    expect((screen.getByRole("radio", { name: "Grid" }) as HTMLInputElement).checked).toBe(true);
    expect(document.querySelector(".timeline")).toBeNull();

    await user.click(screen.getByRole("radio", { name: "Timeline" }));

    expect(document.querySelector(".timeline")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "2023" })).toBeDefined();
    expect(screen.getByRole("heading", { name: /May 2023/ })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Undated" })).toBeDefined();
    expect(source.listCategories).toHaveBeenCalledTimes(1);
  });

  it("keeps the chosen view across a remount", async () => {
    const user = userEvent.setup();
    renderGallery(repository());
    await user.click(await screen.findByRole("radio", { name: "Timeline" }));
    cleanup();

    renderGallery(repository());
    expect(await screen.findByRole("radio", { name: "Timeline" })).toHaveProperty("checked", true);
    expect(localStorage.getItem(GALLERY_VIEW_KEY)).toBe("timeline");
  });

  it("toggles with the keyboard, as a native radio group", async () => {
    const user = userEvent.setup();
    renderGallery(repository());

    const grid = await screen.findByRole("radio", { name: "Grid" });
    grid.focus();
    await user.keyboard("{ArrowRight}");

    expect((screen.getByRole("radio", { name: "Grid" }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("radio", { name: "Timeline" }) as HTMLInputElement).checked).toBe(
      true,
    );
  });
});
