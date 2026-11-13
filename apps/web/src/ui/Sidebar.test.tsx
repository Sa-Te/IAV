// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { AppShell } from "./AppShell.js";

function record(id: string, count: number): CategoryRecord {
  return {
    id,
    resolvedTier: 1,
    entryCount: count,
    data: Array.from({ length: count }, (_, index) => ({
      media: [
        { uri: `media/${id}/${index}.jpg`, title: `${id} ${index}`, creation_timestamp: index },
      ],
    })),
    sources: [{ path: `${id}.json`, entryCount: count, kind: "array" }],
    warnings: [],
  };
}

function repository(): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [record("posts", 3), record("profile_photos", 2)],
    getMediaBlob: async () => null,
    getCategory: async () => null,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

function renderShell(path = "/posts"): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <RepositoryProvider repository={repository()}>
        <AppShell>
          <h1>Page</h1>
        </AppShell>
      </RepositoryProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("sidebar", () => {
  it("renders the galleries and the five tiers", async () => {
    renderShell();
    const galleries = await screen.findByRole("navigation", { name: "Galleries" });
    expect(within(galleries).getByRole("link", { name: /Everything/ })).toBeDefined();

    const categories = screen.getByRole("navigation", { name: "Categories" });
    for (const tier of [1, 2, 3, 4, 5]) {
      expect(
        within(categories).getByRole("button", { name: new RegExp(`T${tier}`) }),
      ).toBeDefined();
    }
  });

  it("toggles a tier disclosure with aria-expanded", async () => {
    const user = userEvent.setup();
    renderShell();
    const categories = screen.getByRole("navigation", { name: "Categories" });
    const button = within(categories).getByRole("button", { name: /T1/ });

    expect(button.getAttribute("aria-expanded")).toBe("false");
    await user.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("collapses to a zero-width column and comes back, remembering the choice", async () => {
    const user = userEvent.setup();
    renderShell();
    const collapse = await screen.findByRole("button", { name: "Hide the sidebar" });

    expect(collapse.getAttribute("aria-expanded")).toBe("true");
    await user.click(collapse);

    // The shell carries the state; CSS derives both the column width and the
    // cyclone's inset from it, so the canvas follows without a re-render.
    expect(document.querySelector(".app-shell")?.getAttribute("data-sidebar")).toBe("closed");
    expect(window.localStorage.getItem("instavault-sidebar")).toBe("closed");

    await user.click(screen.getByRole("button", { name: "Show sidebar" }));
    expect(document.querySelector(".app-shell")?.getAttribute("data-sidebar")).toBe("open");
  });

  it("marks the current route with aria-current and only once", async () => {
    renderShell("/posts");
    const galleries = await screen.findByRole("navigation", { name: "Galleries" });
    await waitFor(() =>
      expect(
        within(galleries).getByRole("link", { name: /Posts/ }).getAttribute("aria-current"),
      ).toBe("page"),
    );
    expect(
      within(galleries)
        .getByRole("link", { name: /Everything/ })
        .getAttribute("aria-current"),
    ).toBeNull();
  });
});

describe("back to top", () => {
  it("appears only after a screenful of scroll and returns to the top", async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByRole("navigation", { name: "Galleries" });

    expect(screen.queryByRole("button", { name: "Back to top" })).toBeNull();
    window.scrollY = 900;
    window.dispatchEvent(new Event("scroll"));
    const button = await screen.findByRole("button", { name: "Back to top" });

    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    await user.click(button);
    expect(scrollTo).toHaveBeenCalled();
  });
});
