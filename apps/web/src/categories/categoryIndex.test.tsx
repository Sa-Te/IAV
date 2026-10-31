// @vitest-environment jsdom
import { CATEGORIES } from "@instavault/core";
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CategoryIndex } from "./CategoryIndex.js";

afterEach(cleanup);

function repositoryWith(records: readonly CategoryRecord[]): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    getMediaBlob: async () => null,
    getCategory: async (id) => records.find((record) => record.id === id) ?? null,
    listCategories: async () => records,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
  };
}

const RECORDS: readonly CategoryRecord[] = [
  {
    id: "saved_posts",
    resolvedTier: 1,
    entryCount: 2,
    data: [{ fbid: "1", media: [], label_values: [{ label: "A", value: "a" }] }],
    sources: [{ path: "saved_posts.json", entryCount: 2, kind: "array" }],
    warnings: [],
  },
  {
    id: "followers",
    resolvedTier: 1,
    entryCount: 3,
    data: [{ title: "a" }],
    sources: [{ path: "followers_1.json", entryCount: 3, kind: "array" }],
    warnings: [],
  },
  {
    id: "posts",
    resolvedTier: 1,
    entryCount: 1,
    data: [{ media: [{ uri: "media/a.jpg" }] }],
    sources: [
      { path: "posts_1.json", entryCount: 1, kind: "array" },
      { path: "posts_2.json", entryCount: 1, kind: "array" },
    ],
    warnings: [],
  },
];

describe("CategoryIndex", () => {
  it("lists every registry category except the bucket, grouped by tier", async () => {
    render(
      <MemoryRouter>
        <RepositoryProvider repository={repositoryWith(RECORDS)}>
          <CategoryIndex />
        </RepositoryProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/categories are in this export/)).toBeDefined();
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent?.slice(0, 2))).toEqual([
      "T1",
      "T2",
      "T3",
      "T4",
      "T5",
    ]);
    // 86 registry categories: the unrecognised bucket is not a category.
    const expected = CATEGORIES.filter((category) => category.id !== "unrecognised").length;
    expect(screen.getAllByRole("row")).toHaveLength(expected + 5);
  });

  it("marks a category that is not in this export as normal, not broken", async () => {
    render(
      <MemoryRouter>
        <RepositoryProvider repository={repositoryWith(RECORDS)}>
          <CategoryIndex />
        </RepositoryProvider>
      </MemoryRouter>,
    );

    await screen.findByText(/categories are in this export/);
    // 14 registry rows are absent from archive-2/, so several rows say so.
    expect(screen.getAllByText("not in this export").length).toBeGreaterThan(1);
  });

  it("links a present category to its generic view and a media category to its gallery", async () => {
    render(
      <MemoryRouter>
        <RepositoryProvider repository={repositoryWith(RECORDS)}>
          <CategoryIndex />
        </RepositoryProvider>
      </MemoryRouter>,
    );

    await screen.findByText(/categories are in this export/);
    expect(screen.getByRole("link", { name: "Saved posts" }).getAttribute("href")).toBe(
      "/categories/saved_posts",
    );
    expect(screen.getByRole("link", { name: "Posts" }).getAttribute("href")).toBe("/posts");
  });

  it("shows the file count only when a category arrived as several files", async () => {
    render(
      <MemoryRouter>
        <RepositoryProvider repository={repositoryWith(RECORDS)}>
          <CategoryIndex />
        </RepositoryProvider>
      </MemoryRouter>,
    );

    await screen.findByText(/categories are in this export/);
    const postsRow = screen.getByRole("link", { name: "Posts" }).closest("tr");
    expect(postsRow?.textContent).toContain("2");
    const savedRow = screen.getByRole("link", { name: "Saved posts" }).closest("tr");
    expect(savedRow?.textContent).not.toContain("Files");
  });
});
