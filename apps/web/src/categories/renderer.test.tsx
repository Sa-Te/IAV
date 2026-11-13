// @vitest-environment jsdom
import type { CategoryRecord, TableView, TreeView } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { JSX } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { CategoryTable } from "./CategoryTable.js";
import { CategoryTree } from "./CategoryTree.js";
import { CategoryView } from "./CategoryView.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";

afterEach(cleanup);

function tableOf(count: number): TableView {
  return {
    kind: "table",
    columns: ["Value"],
    rows: Array.from({ length: count }, (_, index) => [{ text: String(index + 1) }]),
    total: count,
  };
}

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

describe("CategoryTable", () => {
  it("renders 100 rows for a 250-row input and reports the range", () => {
    render(<CategoryTable view={tableOf(250)} caption="Test" />);

    // One header row plus one page of body rows.
    expect(screen.getAllByRole("row")).toHaveLength(101);
    expect(screen.getByText("Rows 1–100 of 250 · page 1 of 3")).toBeDefined();
    expect(screen.queryByText("101")).toBeNull();
  });

  it("shows rows 101-200 on the next page", async () => {
    const user = userEvent.setup();
    render(<CategoryTable view={tableOf(250)} caption="Test" />);

    await user.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("Rows 101–200 of 250 · page 2 of 3")).toBeDefined();
    const rows = screen.getAllByRole("row");
    expect(within(rows[1] ?? document.body).getByText("101")).toBeDefined();
    expect(screen.getAllByRole("row")).toHaveLength(101);
  });

  it("says so, in different words, when there are no rows", () => {
    render(<CategoryTable view={tableOf(0)} caption="Test" />);

    expect(screen.getByText("No rows in this category.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
  });
});

describe("CategoryTree", () => {
  // Mounting 5,000 rows is a genuinely large DOM operation: on a slow CI runner it
  // passes five seconds, which is a property of the test's fixture, not a hang.
  it(
    "renders only the first level of a 5,000-node input until expanded",
    { timeout: 30_000 },
    async () => {
      const user = userEvent.setup();
      const view: TreeView = {
        kind: "tree",
        value: Array.from({ length: 5000 }, (_, index) => ({ index })),
      };
      render(<CategoryTree view={view} caption="Big" />);

      expect(screen.getByText("array [5000]")).toBeDefined();
      // 5,000 children are not in the DOM.
      expect(screen.queryByText("4999")).toBeNull();

      await user.click(screen.getByRole("button", { expanded: false }));

      const list = screen.getAllByRole("listitem");
      expect(list.length).toBeGreaterThan(100);
    },
  );

  it("carries the honesty banner", () => {
    render(<CategoryTree view={{ kind: "tree", value: { a: 1 } }} caption="Raw" />);

    expect(
      screen.getByText(
        "This category is stored exactly as Instagram provided it. We have not interpreted it.",
      ),
    ).toBeDefined();
  });
});

describe("CategoryView", () => {
  const record: CategoryRecord = {
    id: "saved_posts",
    resolvedTier: 1,
    entryCount: 2,
    data: [
      { fbid: "1", media: [], label_values: [{ label: "Saved on", value: "a" }] },
      { fbid: "2", media: [], label_values: [{ label: "Saved on", value: "b" }] },
    ],
    warnings: [],
  };

  function viewFor(repository: ArchiveRepository): JSX.Element {
    return (
      <RepositoryProvider repository={repository}>
        <CategoryView id="saved_posts" />
      </RepositoryProvider>
    );
  }

  it("renders a table from a synthetic envelope fixture", async () => {
    render(viewFor(fakeRepository({ saved_posts: record })));

    expect(await screen.findByRole("table")).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Saved on" })).toBeDefined();
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("renders a tree with the banner for an uninterpretable category", async () => {
    render(
      viewFor(
        fakeRepository({
          saved_posts: { ...record, data: [{ title: "no labels here" }] },
        }),
      ),
    );

    expect(await screen.findByRole("note")).toBeDefined();
  });

  it("distinguishes 'not in this export', 'no entries' and 'failed' in words", async () => {
    render(viewFor(fakeRepository({})));

    expect(await screen.findByText("This category is not in this export.")).toBeDefined();
    cleanup();

    render(viewFor(fakeRepository({ saved_posts: { ...record, entryCount: 0, data: [] } })));

    expect(
      await screen.findByText("This category is in this export but holds no entries."),
    ).toBeDefined();
    cleanup();

    const failing: ArchiveRepository = {
      ...fakeRepository({}),
      getCategory: async () => {
        throw new Error("disk went away");
      },
    };
    render(viewFor(failing));

    expect((await screen.findByRole("alert")).textContent).toContain("disk went away");
  });
});

describe("CategoryView — one category per privacy tier", () => {
  const fixtures: readonly { id: string; tier: string; data: unknown }[] = [
    {
      id: "ad_preferences",
      tier: "T1",
      data: { fbid: "1", media: [], label_values: [{ label: "Ads", value: "personalised" }] },
    },
    {
      id: "saved_posts",
      tier: "T3",
      data: [{ fbid: "1", media: [], label_values: [{ label: "Saved on", value: "a date" }] }],
    },
    {
      id: "threads_viewed",
      tier: "T5",
      data: {
        text_post_app_text_post_app_posts_seen: [
          { string_map_data: { Author: { value: "someone" }, Time: { timestamp: 1 } } },
        ],
      },
    },
  ];

  for (const fixture of fixtures) {
    it(`renders ${fixture.id} (${fixture.tier}) from a synthetic fixture`, async () => {
      const record: CategoryRecord = {
        id: fixture.id,
        resolvedTier: 1,
        entryCount: 1,
        data: fixture.data,
        sources: [{ path: `${fixture.id}.json`, entryCount: 1, kind: "array" }],
        warnings: [],
      };
      render(
        <RepositoryProvider repository={fakeRepository({ [fixture.id]: record })}>
          <CategoryView id={fixture.id} />
        </RepositoryProvider>,
      );

      // T5 is gated: the content only exists after the reveal (ADR 0009 amendment).
      const gate = screen.queryByRole("button", { name: "Show this category" });
      if (gate !== null) await userEvent.setup().click(gate);

      if (fixture.tier === "T1") {
        // T1 label/value categories use the settings screen, not a table
        // (docs/T1-DESIGN.md §4). The label is a definition term, the value a
        // definition description.
        expect((await screen.findByText("Ads")).tagName).toBe("DT");
        expect(screen.getByText("personalised").tagName).toBe("DD");
        expect(screen.queryByRole("table")).toBeNull();
      } else {
        expect(await screen.findByRole("table")).toBeDefined();
        expect(screen.getAllByRole("columnheader").length).toBeGreaterThan(0);
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      }
    });
  }
});

describe("CategoryView — the two measured T1 outliers", () => {
  function record(id: string, data: unknown): CategoryRecord {
    return {
      id,
      resolvedTier: 1,
      entryCount: 1,
      data,
      sources: [{ path: `${id}.json`, entryCount: 1, kind: "array" }],
      warnings: [],
    };
  }

  it("renders avatar_items as labelled placeholders, not a raw tree", async () => {
    const data = [
      { item: "https://scontent.invalid/a.png", type: "FREE", acquisition_time: 1_700_000_000 },
    ];
    render(
      <RepositoryProvider
        repository={fakeRepository({ avatar_items: record("avatar_items", data) })}
      >
        <CategoryView id="avatar_items" />
      </RepositoryProvider>,
    );

    expect(await screen.findByText("Image not included in the export")).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Item 1" })).toBeDefined();
    expect(screen.queryByText("Raw tree")).toBeNull();
  });

  it("renders device_camera_effects_support as devices, not as settings entries", async () => {
    const data = [
      {
        timestamp: 1_700_000_000,
        media: [],
        label_values: [
          { label: "Device ID", value: "0".repeat(32) },
          { label: "Metadata", dict: [{ label: "Supported SDK versions", value: "149.0" }] },
        ],
      },
    ];
    render(
      <RepositoryProvider
        repository={fakeRepository({
          device_camera_effects_support: record("device_camera_effects_support", data),
        })}
      >
        <CategoryView id="device_camera_effects_support" />
      </RepositoryProvider>,
    );

    expect(await screen.findByRole("heading", { level: 2, name: "Device ID" })).toBeDefined();
    expect(screen.getByText("1 record · 1 device profile")).toBeDefined();
    expect(screen.queryByText("Entry 1")).toBeNull();
  });
});

describe("CategoryView — a T2 event category", () => {
  it("renders posts_viewed as the event list, not a table", async () => {
    const data = [
      {
        timestamp: 1_700_000_000,
        media: [],
        label_values: [
          { label: "Caption", value: "a caption" },
          {
            label: "URL",
            href: "https://www.instagram.com/p/De1mMaNF7pZ/",
            value: "",
          },
        ],
      },
    ];
    render(
      <RepositoryProvider
        repository={fakeRepository({
          posts_viewed: {
            id: "posts_viewed",
            resolvedTier: 1,
            entryCount: 1,
            data,
            sources: [{ path: "posts_viewed.json", entryCount: 1, kind: "array" }],
            warnings: [],
          },
        })}
      >
        <CategoryView id="posts_viewed" />
      </RepositoryProvider>,
    );

    expect(await screen.findByText("a caption")).toBeDefined();
    expect(
      screen.getByRole("link", { name: "https://www.instagram.com/p/De1mMaNF7pZ/" }),
    ).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
