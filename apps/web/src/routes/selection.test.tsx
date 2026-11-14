// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CategoryGallery } from "./CategoryGallery.js";

const MB = 1024 * 1024;

/** Five items: two in May 2023, two in June 2023, one undated. */
const POSTS: CategoryRecord = {
  id: "posts",
  resolvedTier: 1,
  entryCount: 5,
  data: [
    {
      media: [
        { uri: "media/posts/may-a.jpg", title: "may a", creation_timestamp: 1683000000 },
        { uri: "media/posts/may-b.jpg", title: "may b", creation_timestamp: 1683100000 },
        { uri: "media/posts/june-a.jpg", title: "june a", creation_timestamp: 1686000000 },
        { uri: "media/posts/june-b.jpg", title: "june b", creation_timestamp: 1686100000 },
        { uri: "media/posts/undated.jpg", title: "undated", creation_timestamp: 0 },
      ],
    },
  ],
  warnings: [],
};

const STORIES: CategoryRecord = {
  id: "stories",
  resolvedTier: 1,
  entryCount: 1,
  data: {
    ig_stories: [{ uri: "media/stories/s.jpg", title: "story", creation_timestamp: 1683000000 }],
  },
  warnings: [],
};

const SIZES: Readonly<Record<string, number>> = {
  "media/posts/may-a.jpg": 10 * MB,
  "media/posts/may-b.jpg": 20 * MB,
  "media/posts/june-a.jpg": 30 * MB,
  "media/posts/june-b.jpg": 40 * MB,
  "media/posts/undated.jpg": 50 * MB,
  "media/stories/s.jpg": 5 * MB,
};

function repository(): ArchiveRepository {
  return {
    listMedia: async () => ({
      items: Object.entries(SIZES).map(([id, bytes]) => ({
        id,
        path: id,
        bytes,
        mime: "image/jpeg",
      })),
      nextCursor: null,
    }),
    listCategories: async () => [POSTS, STORIES],
    getMediaBlob: async () => null,
    getCategory: async (id: string) => (id === "posts" ? POSTS : STORIES),
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 2, media: 6, thumbs: 0 }),
  };
}

function renderPosts(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/posts"]}>
      <RepositoryProvider repository={repository()}>
        <CategoryGallery category="posts" title="Posts" />
      </RepositoryProvider>
    </MemoryRouter>,
  );
}

function tile(name: string): HTMLElement {
  return screen.getByRole("button", { name });
}

async function enterSelection(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await screen.findByText("5 items");
  const select = screen.getByRole("button", { name: "Select" });
  await vi.waitFor(() => expect((select as HTMLButtonElement).disabled).toBe(false));
  await user.click(select);
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

describe("selection mode", () => {
  it("keeps Select as a floating control outside the header, gone while selecting", async () => {
    const user = userEvent.setup();
    renderPosts();
    await screen.findByText("5 items");

    const select = screen.getByRole("button", { name: "Select" });
    await vi.waitFor(() => expect((select as HTMLButtonElement).disabled).toBe(false));
    expect(select.className).toContain("select-fab");
    expect(select.closest(".gallery-toolbar")).toBeNull();

    await user.click(select);

    expect(screen.queryByRole("button", { name: "Select" })).toBeNull();
  });

  it("toggles a tile instead of opening the detail view", async () => {
    const user = userEvent.setup();
    renderPosts();
    await enterSelection(user);

    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "may a" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(tile("may a").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("toolbar", { name: "Selection actions" }).textContent).toContain(
      "1 selected · 10 MB",
    );
  });

  it("still opens the detail view when not selecting", async () => {
    const user = userEvent.setup();
    renderPosts();
    await screen.findByText("5 items");

    await user.click(tile("may a"));

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(tile("may a").getAttribute("aria-pressed")).toBeNull();
  });

  it("selects an inclusive range with shift-click in the view's order", async () => {
    const user = userEvent.setup();
    renderPosts();
    await enterSelection(user);

    fireEvent.click(tile("may a"));
    fireEvent.click(tile("june a"), { shiftKey: true });

    expect(tile("may a").getAttribute("aria-pressed")).toBe("true");
    expect(tile("may b").getAttribute("aria-pressed")).toBe("true");
    expect(tile("june a").getAttribute("aria-pressed")).toBe("true");
    expect(tile("june b").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("toolbar").textContent).toContain("3 selected · 60 MB");
  });

  it("select-all covers the whole view, not the rendered slice", async () => {
    const user = userEvent.setup();
    renderPosts();
    await enterSelection(user);

    await user.click(screen.getByRole("button", { name: "Select all 5" }));

    expect(screen.getByRole("toolbar").textContent).toContain("5 selected · 150 MB");
    for (const name of ["may a", "may b", "june a", "june b", "undated"]) {
      expect(tile(name).getAttribute("aria-pressed")).toBe("true");
    }
  });

  it("deselect all keeps selection mode but empties the selection", async () => {
    const user = userEvent.setup();
    renderPosts();
    await enterSelection(user);
    await user.click(screen.getByRole("button", { name: "Select all 5" }));

    await user.click(screen.getByRole("button", { name: "Deselect all 5" }));

    expect(screen.getByRole("toolbar").textContent).toContain("0 selected · 0 B");
    expect(tile("may a").getAttribute("aria-pressed")).toBe("false");
  });

  it("shift-click follows the timeline order, not the list order", async () => {
    const user = userEvent.setup();
    renderPosts();
    await screen.findByText("5 items");
    await user.click(screen.getByRole("radio", { name: "Timeline" }));
    await enterSelection(user);

    // The Timeline orders groups newest first: June, May, then Undated — so the
    // undated tile sits next to May, not at the far end of the list order.
    fireEvent.click(tile("undated"));
    fireEvent.click(tile("may a"), { shiftKey: true });

    expect(screen.getByRole("toolbar").textContent).toContain("2 selected · 60 MB");
    expect(tile("may a").getAttribute("aria-pressed")).toBe("true");
    expect(tile("may b").getAttribute("aria-pressed")).toBe("false");
    expect(tile("june a").getAttribute("aria-pressed")).toBe("false");
  });

  it("shows a mixed month checkbox and toggles exactly that month", async () => {
    const user = userEvent.setup();
    renderPosts();
    await screen.findByText("5 items");
    await user.click(screen.getByRole("radio", { name: "Timeline" }));
    await enterSelection(user);
    await user.click(tile("may a"));

    const may = within(screen.getByRole("heading", { level: 3, name: /May/ })).getByRole(
      "checkbox",
    );
    expect(may.getAttribute("aria-checked")).toBe("mixed");

    await user.click(may);
    expect(may.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("toolbar").textContent).toContain("2 selected · 30 MB");

    const june = within(screen.getByRole("heading", { level: 3, name: /June/ })).getByRole(
      "checkbox",
    );
    expect(june.getAttribute("aria-checked")).toBe("false");

    await user.click(may);
    expect(screen.getByRole("toolbar").textContent).toContain("0 selected · 0 B");
  });

  it("toggles a whole year and the Undated group from their headings", async () => {
    const user = userEvent.setup();
    renderPosts();
    await screen.findByText("5 items");
    await user.click(screen.getByRole("radio", { name: "Timeline" }));
    await enterSelection(user);

    const year = within(screen.getByRole("heading", { level: 2, name: /2023/ })).getByRole(
      "checkbox",
    );
    await user.click(year);
    expect(screen.getByRole("toolbar").textContent).toContain("4 selected · 100 MB");

    const undated = within(screen.getByRole("heading", { level: 2, name: /Undated/ })).getByRole(
      "checkbox",
    );
    await user.click(undated);
    expect(screen.getByRole("toolbar").textContent).toContain("5 selected · 150 MB");
  });

  it("Escape leaves selection mode and clears", async () => {
    const user = userEvent.setup();
    renderPosts();
    await enterSelection(user);
    await user.click(tile("may a"));

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("toolbar", { name: "Selection actions" })).toBeNull();
    expect(tile("may a").getAttribute("aria-pressed")).toBeNull();
    expect(screen.getByRole("button", { name: "Select" })).toBeDefined();
  });

  it("clears when the route changes and does not come back", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <RepositoryProvider repository={repository()}>
          <nav>
            <Link to="/posts">posts</Link>
            <Link to="/stories">stories</Link>
          </nav>
          <Routes>
            <Route path="/posts" element={<CategoryGallery category="posts" title="Posts" />} />
            <Route
              path="/stories"
              element={<CategoryGallery category="stories" title="Stories" />}
            />
          </Routes>
        </RepositoryProvider>
      </MemoryRouter>,
    );
    await enterSelection(user);
    await user.click(tile("may a"));
    expect(screen.getByRole("toolbar").textContent).toContain("1 selected");

    await user.click(screen.getByRole("link", { name: "stories" }));
    await user.click(screen.getByRole("link", { name: "posts" }));

    await screen.findByText("5 items");
    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(tile("may a").getAttribute("aria-pressed")).toBeNull();
  });
});
