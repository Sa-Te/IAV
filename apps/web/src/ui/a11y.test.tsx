// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CategoryView } from "../categories/CategoryView.js";
import { clearRevealedCategories } from "../categories/RevealGate.js";
import { MediaDetail } from "../media/MediaDetail.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { AppShell } from "./AppShell.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const RECORD: CategoryRecord = {
  id: "saved_posts",
  resolvedTier: 1,
  entryCount: 1,
  data: [{ fbid: "1", media: [], label_values: [{ label: "Saved on", value: "a date" }] }],
  sources: [{ path: "saved_posts.json", entryCount: 1, kind: "array" }],
  warnings: [],
};

function repository(): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [RECORD],
    getMediaBlob: async () => null,
    getCategory: async (id) => (id === RECORD.id ? RECORD : null),
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
  };
}

beforeEach(() => clearRevealedCategories());

describe("landmark and heading walk", () => {
  it("gives a category route one main landmark, one h1 and no skipped level", async () => {
    render(
      <MemoryRouter>
        <RepositoryProvider repository={repository()}>
          <AppShell>
            <CategoryView id="saved_posts" />
          </AppShell>
        </RepositoryProvider>
      </MemoryRouter>,
    );

    await screen.findByRole("table");

    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
    expect(screen.getAllByRole("navigation", { name: "Categories" })).toHaveLength(1);

    const levels = screen
      .getAllByRole("heading")
      .map((heading) => Number(heading.tagName.slice(1)));
    expect(levels[0]).toBe(1);
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index] ?? 0).toBeLessThanOrEqual((levels[index - 1] ?? 0) + 1);
    }
  });

  it("names the table for a screen reader through its caption", async () => {
    render(
      <MemoryRouter>
        <RepositoryProvider repository={repository()}>
          <AppShell>
            <CategoryView id="saved_posts" />
          </AppShell>
        </RepositoryProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("table", { name: /Saved posts/ })).toBeDefined();
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Saved on",
    ]);
  });
});

describe("modal focus", () => {
  const onClose = vi.fn();

  function renderDetail(): void {
    render(
      <RepositoryProvider repository={repository()}>
        <MediaDetail
          item={{ id: "media/a.jpg", caption: "A caption", takenAt: 0, category: "posts" }}
          index={0}
          total={1}
          source={repository()}
          onClose={onClose}
        />
      </RepositoryProvider>,
    );
  }

  it("traps Tab inside the dialog and closes on Escape", async () => {
    const user = userEvent.setup();
    renderDetail();
    const dialog = screen.getByRole("dialog");

    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the controls visible when the user asked for reduced motion", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduced-motion"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));

    renderDetail();
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByRole("dialog").className).not.toContain("is-idle");
  });
});
