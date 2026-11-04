// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMediaList } from "../media/useMediaList.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { createListCache } from "./listCache.js";
import { ListCacheContext } from "./ListCacheContext.js";

afterEach(cleanup);

function record(count: number): CategoryRecord {
  return {
    id: "posts",
    resolvedTier: 1,
    entryCount: count,
    data: Array.from({ length: count }, (_, index) => ({
      media: [{ uri: `media/posts/${index}.jpg`, title: `p${index}`, creation_timestamp: index }],
    })),
    sources: [{ path: "posts_1.json", entryCount: count, kind: "array" }],
    warnings: [],
  };
}

function repositoryWith(records: CategoryRecord[], listCategories = vi.fn()) {
  listCategories.mockImplementation(async () => records);
  const repo: ArchiveRepository = {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories,
    getMediaBlob: async () => null,
    getCategory: async () => null,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 1, categories: 1, media: 0, thumbs: 0 }),
  };
  return { repo, listCategories };
}

function Harness({ category }: { category: string }) {
  const { state } = useMediaList(category);
  return (
    <p data-testid="state">
      {state.status === "loading"
        ? "loading"
        : state.status === "error"
          ? "error"
          : `ready:${state.items.length}`}
    </p>
  );
}

function mount(
  cache: ReturnType<typeof createListCache>,
  repo: ArchiveRepository,
  category = "all",
) {
  return render(
    <ListCacheContext.Provider value={cache}>
      <RepositoryProvider repository={repo}>
        <Harness category={category} />
      </RepositoryProvider>
    </ListCacheContext.Provider>,
  );
}

describe("list cache", () => {
  it("renders a hit immediately after an unmount and remount, with no loading state", async () => {
    const cache = createListCache();
    const { repo } = repositoryWith([record(3)]);

    const first = mount(cache, repo);
    expect(screen.getByTestId("state").textContent).toBe("loading");
    await screen.findByText("ready:3");
    first.unmount();

    const second = mount(cache, repo);
    // Immediately ready: no loading frame at all.
    expect(screen.getByTestId("state").textContent).toBe("ready:3");
    second.unmount();
  });

  it("does not refetch the list when a route is visited again", async () => {
    const cache = createListCache();
    const { repo, listCategories } = repositoryWith([record(3)]);

    mount(cache, repo, "posts");
    await screen.findByText("ready:3");
    cleanup();

    mount(cache, repo, "posts");
    await screen.findByText("ready:3");

    expect(listCategories).toHaveBeenCalledTimes(1);
  });

  it("updates in place when a background refresh returns a different count", async () => {
    const cache = createListCache();
    const { repo } = repositoryWith([record(3)]);

    mount(cache, repo);
    await screen.findByText("ready:3");

    await act(async () => {
      await cache.refresh("all", async () => ({
        items: [{ id: "a", caption: "", takenAt: 0, category: "posts" }],
        counts: { posts: 1 },
      }));
    });

    // No loading state, a new count.
    expect(screen.getByTestId("state").textContent).toBe("ready:1");
  });

  it("is emptied by a wipe", async () => {
    const cache = createListCache();
    const { repo } = repositoryWith([record(3)]);

    const first = mount(cache, repo);
    await screen.findByText("ready:3");
    first.unmount();

    cache.clear();
    mount(cache, repo);

    expect(screen.getByTestId("state").textContent).toBe("loading");
    await screen.findByText("ready:3");
  });
});
