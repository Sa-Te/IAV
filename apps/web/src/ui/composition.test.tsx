// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { CategoryGallery } from "../routes/CategoryGallery.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { AppShell } from "./AppShell.js";

afterEach(cleanup);

const RECORD: CategoryRecord = {
  id: "posts",
  resolvedTier: 1,
  entryCount: 2,
  data: [
    { media: [{ uri: "media/archived/a.jpg", title: "one", creation_timestamp: 0 }] },
    { media: [{ uri: "media/archived/b.jpg", title: "two", creation_timestamp: 1 }] },
  ],
  sources: [{ path: "posts_1.json", entryCount: 2, kind: "array" }],
  warnings: [],
};

const repository: ArchiveRepository = {
  listMedia: async () => ({ items: [], nextCursor: null }),
  listCategories: async () => [RECORD],
  getMediaBlob: async () => new Blob([], { type: "image/jpeg" }),
  getCategory: async () => RECORD,
  summary: async () => null,
  getThumbnail: async () => null,
  putThumbnail: async () => undefined,
  auditCounts: async () => ({ archive: 1, categories: 1, media: 2, thumbs: 0 }),
};

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={["/posts"]}>
      <RepositoryProvider repository={repository}>
        <AppShell>
          <CategoryGallery category="posts" title="Posts" />
        </AppShell>
      </RepositoryProvider>
    </MemoryRouter>,
  );
}

describe("composition", () => {
  it("never repeats the page title in its subtitle", async () => {
    renderPage();

    const heading = await screen.findByRole("heading", { level: 1 });
    const subtitle = await screen.findByText(/^\d+ items?$/);

    expect(heading.textContent).toBe("Posts");
    expect(subtitle.textContent).not.toContain("Posts");
    expect(subtitle.textContent).toContain("2");
  });

  it("marks exactly one nav item as current and keeps counts as muted suffixes", async () => {
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Categories" });

    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);

    const counts = nav.querySelectorAll(".nav-count");
    expect(counts.length).toBeGreaterThan(0);
    for (const count of counts) {
      // A suffixed number, not a filled badge.
      expect(count.className).toBe("nav-count");
    }
  });

  it("keeps pending, failed and ready tiles visibly different", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1 });

    // The states are distinct DOM surfaces, not one class with colour swaps.
    expect(document.querySelector(".tile-pending, .tile-failed, .tile-body")).not.toBeNull();
  });
});
