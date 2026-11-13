// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CyclonePage } from "./CyclonePage.js";
import { startCyclone } from "./startCyclone.js";

/**
 * A black canvas is not an answer (AGENTS.md §7, §8): when the texture window
 * settles with nothing in it, the route says so and shows the grid. Split from
 * cyclone.test.tsx to keep both files inside the 400-line gate.
 */

vi.mock("./startCyclone.js", () => ({ startCyclone: vi.fn() }));

const startMock = vi.mocked(startCyclone);

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
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

function stubFrames(): (now: number) => void {
  const pending: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    pending.push(callback),
  );
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  return (now: number) => {
    for (const callback of pending.splice(0)) callback(now);
  };
}

beforeEach(() => {
  startMock.mockReset();
  startMock.mockReturnValue({
    stop: vi.fn(),
    pointer: () => null,
    setPhase: vi.fn(),
    setTilt: vi.fn(),
    frame: vi.fn(),
    stats: () => ({ resident: 0, bytes: 0, drawCalls: 0 }),
    renderer: "test",
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("an empty scene is a visible failure", () => {
  it("falls back to the grid with a sentence when no texture resolves in time", async () => {
    const frames = stubFrames();

    render(
      <MemoryRouter>
        <RepositoryProvider repository={repository(12)}>
          <CyclonePage />
        </RepositoryProvider>
      </MemoryRouter>,
    );
    await screen.findByRole("list", { name: "All media, in cyclone order" });
    // The stage's effect installs the frame callback after the list resolves.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Drive frames until the deadline fires; each `await` lets a freshly mounted
    // stage install its requestAnimationFrame callback first.
    let now = performance.now();
    for (let frame = 0; frame < 400; frame += 1) {
      if (screen.queryByText(/could not prepare any of these images/) !== null) break;
      frames((now += 16));
      await Promise.resolve();
    }

    expect(await screen.findByText(/could not prepare any of these images/)).toBeDefined();
    expect(screen.getAllByRole("button", { name: /Open|post/ }).length).toBeGreaterThan(0);
  });
});
