// @vitest-environment jsdom
import type { ArchiveRow, CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearMediaRequestCache } from "../media/useMediaUrl.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CategoryGallery } from "./CategoryGallery.js";
import { buildRoutes } from "./routes.js";

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });
const MP4 = new Blob([new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70])], {
  type: "video/mp4",
});

const CATEGORIES: CategoryRecord[] = [
  {
    id: "posts",
    resolvedTier: 1,
    entryCount: 2,
    data: [
      { media: [{ uri: "media/posts/a.jpg", title: "post one", creation_timestamp: 1700000000 }] },
      { media: [{ uri: "media/posts/b.jpg", title: "", creation_timestamp: 1700000100 }] },
    ],
    warnings: [],
  },
  {
    id: "stories",
    resolvedTier: 1,
    entryCount: 1,
    data: {
      ig_stories: [
        { uri: "media/stories/s.mp4", title: "story one", creation_timestamp: 1700000200 },
      ],
    },
    warnings: [],
  },
  {
    id: "archived_posts",
    resolvedTier: 1,
    entryCount: 1,
    data: {
      ig_archived_post_media: [
        {
          media: [
            { uri: "media/archived/z.jpg", title: "archived one", creation_timestamp: 1700000300 },
          ],
        },
      ],
    },
    warnings: [],
  },
  {
    id: "notification_preferences",
    resolvedTier: 1,
    entryCount: 1,
    data: { settings_notification_preferences: [] },
    warnings: [],
  },
];

const SUMMARY: ArchiveRow = {
  id: "current",
  fingerprint: "fmt-test1",
  importedAt: "2026-10-31T00:00:00.000Z",
  sourceBytes: 10,
  counts: {
    categories: 4,
    entries: 4,
    mediaStored: 4,
    mediaMissing: 0,
    mediaOrphans: 0,
    unrecognised: 0,
  },
  drift: null,
  job: { status: "idle" },
};

function repository(overrides: Partial<ArchiveRepository> = {}): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => CATEGORIES,
    getMediaBlob: async (id: string) => (id === "media/stories/s.mp4" ? MP4 : JPEG),
    getCategory: async (id: string) => CATEGORIES.find((record) => record.id === id) ?? null,
    summary: async () => SUMMARY,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    ...overrides,
  };
}

function renderGallery(
  repo: ArchiveRepository,
  category = "all",
  path = "/",
): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RepositoryProvider repository={repo}>
        <CategoryGallery category={category} title="Everything" />
      </RepositoryProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  clearMediaRequestCache();
  URL.createObjectURL = vi.fn(() => "blob:tile");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("CategoryGallery", () => {
  it("spans every category on /all", async () => {
    renderGallery(repository());
    await screen.findByText(/4 items/);

    // Three categories contributed: a regression to "posts only" would render 2.
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    // The story is a video: it has no alt text, it has an accessible tile name.
    expect(await screen.findByRole("button", { name: "story one" })).toBeTruthy();
    expect(await screen.findByAltText("archived one")).toBeTruthy();
  });

  it("shows only the requested category on a category route", async () => {
    renderGallery(repository(), "posts", "/posts");
    await screen.findByText(/2 items/);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("MediaTile states", () => {
  it("renders pending, ready and failed distinctly", async () => {
    let release: ((blob: Blob) => void) | undefined;
    const slow = new Promise<Blob>((resolve) => {
      release = resolve;
    });

    renderGallery(
      repository({
        getMediaBlob: async (id: string) => {
          if (id === "media/posts/a.jpg") return JPEG;
          if (id === "media/posts/b.jpg") return null;
          return slow;
        },
      }),
    );

    expect(await screen.findByText("File missing")).toBeTruthy();
    await waitFor(() => expect(screen.getByAltText("post one")).toBeTruthy());
    // Still loading: no image, no failure text, only the skeleton.
    expect(document.querySelectorAll(".tile-pending").length).toBeGreaterThan(0);

    release?.(JPEG);
    await waitFor(() => expect(document.querySelectorAll(".tile-pending")).toHaveLength(0));
  });

  it("renders a video tile with preload=metadata and no autoplay", async () => {
    renderGallery(repository(), "stories");
    const video = await screen.findByTestId("tile-video");
    expect(video.getAttribute("preload")).toBe("metadata");
    expect(video.hasAttribute("autoplay")).toBe(false);
    expect(video.hasAttribute("controls")).toBe(false);
  });
});

describe("MediaDetail", () => {
  it("opens from the keyboard, closes on Escape, returns focus, and gives video controls", async () => {
    const user = userEvent.setup();
    renderGallery(repository(), "stories");

    const tile = await screen.findByRole("button", { name: "story one" });
    tile.focus();
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("story one")).toBeTruthy();
    const video = await within(dialog).findByTestId("detail-video");
    expect(video.hasAttribute("controls")).toBe(true);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(tile);
  });
});

describe("Nav", () => {
  it("lists only categories with media and marks the current one", async () => {
    renderGallery(repository(), "posts", "/posts");
    const nav = await screen.findByRole("navigation", { name: "Categories" });

    expect(await within(nav).findByRole("link", { name: /Posts/ })).toBeTruthy();
    expect(await within(nav).findByRole("link", { name: /Stories/ })).toBeTruthy();
    expect(await within(nav).findByRole("link", { name: /Archived/ })).toBeTruthy();
    // A category with zero media items is not offered.
    expect(within(nav).queryByRole("link", { name: /Notifications/ })).toBeNull();

    const current = nav.querySelector('[aria-current="page"]');
    expect(current?.textContent).toContain("Posts");
  });
});

describe("dev route gate", () => {
  it("is absent from the production route table", () => {
    const production = buildRoutes(false).map((route) => route.path);
    const development = buildRoutes(true).map((route) => route.path);

    expect(production).not.toContain("/dev/ingest");
    expect(development).toContain("/dev/ingest");
    expect(production).toEqual([
      "/",
      "/posts",
      "/stories",
      "/archived",
      "/categories",
      "/categories/:id",
    ]);
  });
});
