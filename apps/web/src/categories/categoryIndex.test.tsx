// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CategoryIndex } from "./CategoryIndex.js";

/**
 * `/categories` is an overview of the five tiers since M18; the registry join
 * itself is covered through the tier pages (TierPage.test.tsx) and the sidebar.
 */

function record(id: string, count: number): CategoryRecord {
  return {
    id,
    resolvedTier: 1,
    entryCount: count,
    data: [{ value: id }],
    sources: [],
    warnings: [],
  };
}

function repository(): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [record("notification_preferences", 1)],
    getMediaBlob: async () => null,
    getCategory: async () => null,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

afterEach(cleanup);

describe("CategoryIndex", () => {
  it("links all five tiers instead of listing every category", async () => {
    render(
      <MemoryRouter>
        <RepositoryProvider repository={repository()}>
          <CategoryIndex />
        </RepositoryProvider>
      </MemoryRouter>,
    );

    for (const tier of [1, 2, 3, 4, 5]) {
      expect(await screen.findByRole("link", { name: new RegExp(`^T${tier} —`) })).toBeDefined();
    }
    // The old page rendered a table of 86 rows; the overview renders none.
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("says how many categories of each tier the export contains", async () => {
    render(
      <MemoryRouter>
        <RepositoryProvider repository={repository()}>
          <CategoryIndex />
        </RepositoryProvider>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText(/in this export/)).length).toBeGreaterThan(0);
  });
});
