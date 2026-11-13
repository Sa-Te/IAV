// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CategoryIndex } from "./CategoryIndex.js";

afterEach(cleanup);

function record(id: string): CategoryRecord {
  return {
    id,
    resolvedTier: 1,
    entryCount: 1,
    data: [{ fbid: "1", media: [], label_values: [{ label: "A", value: "a" }] }],
    sources: [{ path: `${id}.json`, entryCount: 1, kind: "array" }],
    warnings: [],
  };
}

function repo(listCategories: () => Promise<readonly CategoryRecord[]>): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories,
    getMediaBlob: async () => null,
    getCategory: async () => null,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 1, categories: 3, media: 0, thumbs: 0 }),
  };
}

function renderIndex(repository: ArchiveRepository): void {
  render(
    <MemoryRouter>
      <RepositoryProvider repository={repository}>
        <CategoryIndex />
      </RepositoryProvider>
    </MemoryRouter>,
  );
}

describe("category index is built from the registry", () => {
  it("lists every tier even when only three categories are stored", async () => {
    renderIndex(repo(async () => [record("posts"), record("stories"), record("followers")]));
    await screen.findAllByText(/of \d+ in this export/);

    // Every tier is offered, and the counts say how much of it arrived.
    for (const tier of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole("link", { name: new RegExp(`^T${tier} —`) })).toBeDefined();
    }
    expect(screen.getAllByText(/of \d+ in this export/).length).toBe(5);
  });

  it("lists every tier, with zero present, when the store is empty", async () => {
    renderIndex(repo(async () => []));
    await screen.findAllByText(/of \d+ in this export/);

    for (const label of screen.getAllByText(/in this export/)) {
      expect(label.textContent).toMatch(/^0 of \d+ in this export$/);
    }
  });

  it("shows an error state, never an empty page, when the read fails", async () => {
    renderIndex(
      repo(async () => {
        throw new Error("IndexedDB is unavailable");
      }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("IndexedDB is unavailable");
    // The page still names itself; it is not blank.
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Categories");
  });
});
