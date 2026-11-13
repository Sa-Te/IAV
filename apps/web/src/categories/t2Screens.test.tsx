// @vitest-environment jsdom
import {
  toNameListView,
  toSettingsView,
  type CategoryRecord,
  type MediaItemView,
} from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearMediaRequestCache } from "../media/useMediaUrl.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CategoryView } from "./CategoryView.js";
import { NameListView } from "./NameListView.js";
import { ProfileView } from "./ProfileView.js";

afterEach(cleanup);

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });

beforeEach(() => {
  clearMediaRequestCache();
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:profile-photo",
    revokeObjectURL: () => undefined,
  });
  vi.stubGlobal("createImageBitmap", async () => ({ close: () => undefined }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function profileView() {
  const view = toSettingsView({
    data: {
      string_map_data: {
        Username: { href: "", value: "someone", timestamp: 0 },
        Bio: { href: "", value: "a bio", timestamp: 0 },
      },
    },
  });
  expect(view).not.toBeNull();
  if (view === null) throw new Error("no profile view");
  return view;
}

const PHOTO: MediaItemView = {
  id: "media/other/profile.jpg",
  caption: "",
  takenAt: 0,
  category: "personal_information",
};

function fakeRepository(records: Record<string, CategoryRecord>): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    getMediaBlob: async () => null,
    getCategory: async (id) => records[id] ?? null,
    listCategories: async () => Object.values(records),
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

describe("profile screen", () => {
  it("renders exactly one image whose src is a local blob URL", async () => {
    render(
      <ProfileView
        view={profileView()}
        media={[PHOTO]}
        source={{ getMediaBlob: async () => JPEG }}
        raw={{}}
      />,
    );

    const image = await screen.findByRole("img", { name: "Profile photo" });
    expect(image.getAttribute("src")).toBe("blob:profile-photo");
    expect(document.querySelectorAll("img")).toHaveLength(1);
    expect(screen.getByText("Username").tagName).toBe("DT");
    expect(screen.getByText("someone").tagName).toBe("DD");
  });

  it("says the photo is missing instead of showing a broken image", async () => {
    render(
      <ProfileView
        view={profileView()}
        media={[PHOTO]}
        source={{ getMediaBlob: async () => null }}
        raw={{}}
      />,
    );

    expect(await screen.findByText(/not stored on this device/)).toBeDefined();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders a present-but-empty category as empty", () => {
    const empty = toSettingsView({ data: [] });
    expect(empty).not.toBeNull();
    if (empty === null) return;
    render(
      <ProfileView view={empty} media={[]} source={{ getMediaBlob: async () => null }} raw={[]} />,
    );
    expect(screen.getByText(/holds no entries/)).toBeDefined();
  });
});

function nameView(count: number) {
  const view = toNameListView({
    data: {
      media: [],
      label_values: [
        {
          label: "Names",
          vec: Array.from({ length: count }, (_, index) => ({ value: `name-${index}` })),
        },
        { label: "Explanation", value: "why" },
      ],
    },
  });
  expect(view).not.toBeNull();
  if (view === null) throw new Error("no name view");
  return view;
}

describe("name/place list screen", () => {
  it("shows 200 names, then the remaining 50", async () => {
    const user = userEvent.setup();
    render(<NameListView view={nameView(250)} raw={[]} />);

    expect(screen.getByText("250 names")).toBeDefined();
    expect(document.querySelectorAll(".name-list li")).toHaveLength(200);
    await user.click(screen.getByRole("button", { name: "Show 50 more" }));
    expect(document.querySelectorAll(".name-list li")).toHaveLength(250);
  });

  it("renders an explanatory text value beside the names", () => {
    render(<NameListView view={nameView(2)} raw={[]} />);
    expect(screen.getByRole("heading", { level: 2, name: "Explanation" })).toBeDefined();
    expect(screen.getByText("why")).toBeDefined();
  });

  it("renders a present-but-empty list as empty", () => {
    render(<NameListView view={{ kind: "name-list", sections: [], total: 0 }} raw={[]} />);
    expect(screen.getByText(/holds no names/)).toBeDefined();
  });

  it("keeps the raw JSON behind a closed disclosure", async () => {
    const user = userEvent.setup();
    render(<NameListView view={nameView(2)} raw={{ hello: "world" }} />);
    const summary = screen.getByText("Raw data");
    const details = summary.closest("details");
    expect(details?.open).toBe(false);
    await user.click(summary);
    expect(details?.open).toBe(true);
  });
});

describe("CategoryView — T2 profile with a local photo", () => {
  it("renders exactly one image whose src is a blob URL, and no CDN link", async () => {
    clearMediaRequestCache();
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:profile-photo",
      revokeObjectURL: () => undefined,
    });
    vi.stubGlobal("createImageBitmap", async () => ({ close: () => undefined }));

    const data = {
      profile_user: [
        {
          media_map_data: {
            "Profile Photo": { uri: "media/other/profile.jpg", creation_timestamp: 0 },
          },
          string_map_data: {
            Username: { href: "", value: "someone", timestamp: 0 },
          },
        },
      ],
    };
    const record: CategoryRecord = {
      id: "personal_information",
      resolvedTier: 1,
      entryCount: 1,
      data,
      sources: [{ path: "personal_information.json", entryCount: 1, kind: "object" }],
      warnings: [],
    };
    const base = fakeRepository({ personal_information: record });
    const repository: ArchiveRepository = {
      ...base,
      getMediaBlob: async () =>
        new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" }),
    };

    render(
      <RepositoryProvider repository={repository}>
        <CategoryView id="personal_information" />
      </RepositoryProvider>,
    );

    const image = await screen.findByRole("img", { name: "Profile photo" });
    expect(image.getAttribute("src")).toBe("blob:profile-photo");
    expect(document.querySelectorAll("img")).toHaveLength(1);
    expect(document.querySelector('a[href*="fbcdn"]')).toBeNull();
    expect(document.querySelector('a[href*="cdninstagram"]')).toBeNull();
  });
});

describe("CategoryView — T2 settings and name lists", () => {
  function record(id: string, data: unknown): CategoryRecord {
    return {
      id,
      resolvedTier: 1,
      entryCount: 1,
      data,
      sources: [{ path: `${id}.json`, entryCount: 1, kind: "object" }],
      warnings: [],
    };
  }

  it("renders signup_details with the settings screen", async () => {
    const data = {
      string_map_data: {
        Username: { href: "", value: "someone", timestamp: 0 },
        Device: { href: "", value: "a device", timestamp: 0 },
      },
    };
    render(
      <RepositoryProvider
        repository={fakeRepository({ signup_details: record("signup_details", data) })}
      >
        <CategoryView id="signup_details" />
      </RepositoryProvider>,
    );

    expect((await screen.findByText("Username")).tagName).toBe("DT");
    expect(screen.getByText("someone").tagName).toBe("DD");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("renders other_categories_used_to_reach_you as a name list", async () => {
    const data = {
      media: [],
      label_values: [
        {
          label: "Name",
          vec: [{ value: "one" }, { value: "two" }],
        },
      ],
    };
    render(
      <RepositoryProvider
        repository={fakeRepository({
          other_categories_used_to_reach_you: record("other_categories_used_to_reach_you", data),
        })}
      >
        <CategoryView id="other_categories_used_to_reach_you" />
      </RepositoryProvider>,
    );

    expect(await screen.findByRole("heading", { level: 2, name: "Name" })).toBeDefined();
    expect(screen.getByText("2 names")).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
