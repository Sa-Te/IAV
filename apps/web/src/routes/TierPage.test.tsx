// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { TierPage } from "./TierPage.js";

function record(id: string, count: number): CategoryRecord {
  return {
    id,
    resolvedTier: 1,
    entryCount: count,
    data: Array.from({ length: count }, (_, index) => ({ label_values: [{ value: `${index}` }] })),
    sources: [{ path: `${id}.json`, entryCount: count, kind: "object" }],
    warnings: [],
  };
}

function repository(): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [record("notification_preferences", 2)],
    getMediaBlob: async () => null,
    getCategory: async () => null,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

afterEach(cleanup);

describe("tier page", () => {
  it("lists present categories as links and absent ones as non-links, in separate groups", async () => {
    render(
      <MemoryRouter initialEntries={["/tiers/t1"]}>
        <RepositoryProvider repository={repository()}>
          <Routes>
            <Route path="/tiers/:tier" element={<TierPage />} />
          </Routes>
        </RepositoryProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { level: 2, name: /In this export/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /Notification preferences/ })).toBeDefined();

    const absentGroup = screen.getByRole("heading", { level: 2, name: /Not in this export/ });
    expect(absentGroup).toBeDefined();
    // The absent group is after the present one in the document.
    const groups = screen.getAllByRole("heading", { level: 2 });
    expect(groups[0]?.textContent).toMatch(/In this export/);
    expect(groups[1]?.textContent).toMatch(/Not in this export/);
  });
});
