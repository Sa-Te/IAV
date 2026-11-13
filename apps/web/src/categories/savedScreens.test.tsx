// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CategoryView } from "./CategoryView.js";
import { clearMediaRequestCache } from "../media/useMediaUrl.js";
import { clearRevealedCategories } from "./RevealGate.js";

/**
 * The M22 follow-up screens: profile_photos, and saved posts/collections by folder.
 *
 * The media tests include one where the blob is genuinely absent and one where it is
 * there, because a fake repository can lie about a media view by omission (AGENTS
 * §9).
 */

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });

beforeEach(() => {
  clearMediaRequestCache();
  clearRevealedCategories();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubMedia(): void {
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:local",
    revokeObjectURL: () => undefined,
  });
  vi.stubGlobal("createImageBitmap", async () => ({ close: () => undefined }));
}

function recordFor(id: string, data: unknown): CategoryRecord {
  return {
    id,
    resolvedTier: 1,
    entryCount: Array.isArray(data) ? data.length : 1,
    data,
    sources: [{ path: `${id}.json`, entryCount: 1, kind: "array" }],
    warnings: [],
  };
}

function repositoryWith(
  records: readonly CategoryRecord[],
  blobs: Readonly<Record<string, Blob | null>> = {},
): ArchiveRepository {
  const byId = new Map(records.map((record) => [record.id, record]));
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    getMediaBlob: async (id) => blobs[id] ?? null,
    getCategory: async (id) => byId.get(id) ?? null,
    listCategories: async () => [...byId.values()],
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

function renderView(
  records: readonly CategoryRecord[],
  id: string,
  blobs?: Readonly<Record<string, Blob | null>>,
): void {
  render(
    <RepositoryProvider repository={repositoryWith(records, blobs)}>
      <CategoryView id={id} />
    </RepositoryProvider>,
  );
}

const PROFILE_PHOTO = {
  ig_profile_picture: [
    {
      uri: "media/other/profile.jpg",
      creation_timestamp: 1_700_000_000,
      title: "a caption",
      cross_post_source: { source_app: "FB" },
    },
  ],
};

describe("profile_photos", () => {
  it("renders the local photo with its caption and date", async () => {
    stubMedia();
    renderView([recordFor("profile_photos", PROFILE_PHOTO)], "profile_photos", {
      "media/other/profile.jpg": JPEG,
    });

    const image = await screen.findByRole("img", { name: "a caption" });
    expect(image.getAttribute("src")).toBe("blob:local");
    expect(screen.getByText("a caption")).toBeDefined();
    expect(document.querySelector("time")?.getAttribute("datetime")).toContain("2023-11-14");
    expect(screen.getByText("1 photo")).toBeDefined();
  });

  it("says the photo is not on this device instead of a broken image", async () => {
    stubMedia();
    renderView([recordFor("profile_photos", PROFILE_PHOTO)], "profile_photos", {});

    expect(await screen.findByText(/not stored on this device/)).toBeDefined();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders a present-but-empty category as empty", async () => {
    renderView([recordFor("profile_photos", { ig_profile_picture: [] })], "profile_photos");

    expect(await screen.findByText(/holds no photos/)).toBeDefined();
    expect(screen.getByText("0 photos")).toBeDefined();
  });
});

const savedPost = (url: string, caption: string, timestamp: number): unknown => ({
  fbid: url,
  timestamp,
  media: [],
  label_values: [
    { label: "URL", value: url, href: url },
    { label: "Caption", value: caption },
    { label: "Title", value: "" },
  ],
});

const COLLECTIONS = [
  {
    fbid: "1",
    timestamp: 1_717_963_999,
    media: [],
    label_values: [
      { label: "Name", value: "first folder" },
      { label: "Type", value: "Default" },
      { label: "Privacy", value: "Private" },
      { label: "Update time", timestamp_value: 1_717_964_000 },
      {
        dict: [
          {
            title: "",
            dict: [
              {
                label: "URL",
                value: "https://www.instagram.com/p/AAA111/",
                href: "https://www.instagram.com/p/AAA111/",
              },
              { label: "Caption", value: "inside a folder" },
              { label: "Title", value: "" },
            ],
          },
        ],
      },
    ],
  },
];

const SAVED_POSTS = [
  savedPost("https://www.instagram.com/p/AAA111/", "inside a folder", 1_700_000_000),
  savedPost("https://www.instagram.com/p/CCC333/", "no folder", 1_700_000_100),
];

describe("saved collections — one folder per collection", () => {
  it("lists each collection with the posts nested in it", async () => {
    renderView(
      [recordFor("saved_collections", COLLECTIONS), recordFor("saved_posts", SAVED_POSTS)],
      "saved_collections",
    );

    expect(await screen.findByText("1 collection · 1 saved post")).toBeDefined();
    const folder = screen.getByText("first folder").closest("details");
    expect(folder).not.toBeNull();
    if (folder === null) return;
    expect(within(folder).getByText("inside a folder")).toBeDefined();
    expect(
      within(folder).getByRole("link", { name: "https://www.instagram.com/p/AAA111/" }),
    ).toBeDefined();
    // The uncollected post belongs to the saved-posts screen, not this one.
    expect(screen.queryByText("no folder")).toBeNull();
  });
});

describe("saved posts — folders, then what is in none", () => {
  it("groups a post under its folder and leaves the rest in 'Not in a collection'", async () => {
    renderView(
      [recordFor("saved_collections", COLLECTIONS), recordFor("saved_posts", SAVED_POSTS)],
      "saved_posts",
    );

    expect(
      await screen.findByText(/1 collection · 1 saved post · 1 post in no collection/),
    ).toBeDefined();
    const folder = screen.getByText("first folder").closest("details");
    const loose = screen.getByText("Not in a collection").closest("details");
    expect(folder).not.toBeNull();
    expect(loose).not.toBeNull();
    if (folder === null || loose === null) return;
    expect(within(folder).getByText("inside a folder")).toBeDefined();
    expect(within(loose).getByText("no folder")).toBeDefined();
  });

  it("falls back to the event list when this export has no collections", async () => {
    renderView([recordFor("saved_posts", SAVED_POSTS)], "saved_posts");

    expect(await screen.findByText("2 entries")).toBeDefined();
    expect(document.querySelector(".event-view")).not.toBeNull();
    expect(screen.queryByText("Not in a collection")).toBeNull();
  });

  it("renders a present-but-empty collection list as empty", async () => {
    renderView(
      [recordFor("saved_collections", []), recordFor("saved_posts", [])],
      "saved_collections",
    );

    expect(await screen.findByText(/holds no saved posts/)).toBeDefined();
  });
});
