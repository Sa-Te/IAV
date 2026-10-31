// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CyclonePage } from "./CyclonePage.js";
import { startCyclone } from "./startCyclone.js";

vi.mock("./startCyclone.js", () => ({ startCyclone: vi.fn() }));

const startMock = vi.mocked(startCyclone);

function handle() {
  return {
    stop: vi.fn(),
    pointer: () => null,
    setPhase: vi.fn(),
    frame: vi.fn(),
    stats: () => ({ resident: 0, bytes: 0, drawn: 0 }),
    renderer: "test",
  };
}

function record(count: number): CategoryRecord {
  return {
    id: "posts",
    resolvedTier: 1,
    entryCount: count,
    data: Array.from({ length: count }, (_, index) => ({
      media: [
        { uri: `media/posts/${index}.jpg`, title: `post ${index}`, creation_timestamp: index },
      ],
    })),
    sources: [{ path: "posts_1.json", entryCount: count, kind: "array" }],
    warnings: [],
  };
}

function repository(count: number): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [record(count)],
    getMediaBlob: async () => null,
    getCategory: async () => null,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
  };
}

function renderPage(count = 12): void {
  render(
    <MemoryRouter>
      <RepositoryProvider repository={repository(count)}>
        <CyclonePage />
      </RepositoryProvider>
    </MemoryRouter>,
  );
}

function reduceMotion(on: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: on && query.includes("reduced-motion"),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  startMock.mockReset();
  startMock.mockReturnValue(handle());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("cyclone fallbacks", () => {
  it("renders the grid and says why when WebGL2 is unavailable", async () => {
    startMock.mockReturnValue(null);
    renderPage();

    expect(await screen.findByText(/needs WebGL2/)).toBeDefined();
    // The grid is real, not a dead canvas.
    expect(screen.getAllByRole("button", { name: /Open|post/ }).length).toBeGreaterThan(0);
  });

  it("renders the grid when there are fewer than eight items", async () => {
    renderPage(3);

    expect(await screen.findByText(/needs at least 8 media items/)).toBeDefined();
    expect(startMock).not.toHaveBeenCalled();
  });

  it("does not start the motion loop under reduced motion until asked", async () => {
    const user = userEvent.setup();
    reduceMotion(true);
    renderPage();

    await screen.findByRole("button", { name: "Start motion" });
    expect(startMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Start motion" }));
    expect(startMock).toHaveBeenCalledTimes(1);
  });
});

describe("cyclone accessibility", () => {
  it("exposes the same number of items as buttons in the hidden list", async () => {
    renderPage(12);
    const list = await screen.findByRole("list", { name: "All media, in cyclone order" });

    expect(within(list).getAllByRole("button")).toHaveLength(12);
  });

  it("never makes the canvas a tab stop", async () => {
    const { container } = render(
      <MemoryRouter>
        <RepositoryProvider repository={repository(12)}>
          <CyclonePage />
        </RepositoryProvider>
      </MemoryRouter>,
    );
    await screen.findByRole("list", { name: "All media, in cyclone order" });
    const canvas = container.querySelector("canvas");

    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
    expect(canvas?.getAttribute("tabindex")).toBeNull();
  });
});

describe("cyclone keyboard", () => {
  it("moves the highlight by exactly one on ArrowDown", async () => {
    const user = userEvent.setup();
    renderPage(12);
    const list = await screen.findByRole("list", { name: "All media, in cyclone order" });
    const buttons = within(list).getAllByRole("button");

    expect(buttons[0]?.getAttribute("aria-current")).toBe("true");

    buttons[0]?.focus();
    await user.keyboard("{ArrowDown}");

    expect(buttons[1]?.getAttribute("aria-current")).toBe("true");
    expect(buttons[0]?.getAttribute("aria-current")).toBe("false");
  });

  it("opens the detail for the highlighted item on Enter", async () => {
    const user = userEvent.setup();
    renderPage(12);
    const list = await screen.findByRole("list", { name: "All media, in cyclone order" });
    const buttons = within(list).getAllByRole("button");

    buttons[2]?.focus();
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("post 2");
  });
});
