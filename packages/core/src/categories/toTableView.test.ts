import { describe, expect, it } from "vitest";

import { PAGE_SIZE, toTableView } from "./toTableView.js";

/**
 * One test per shape the two exports actually contain. Each asserts a derived
 * value — a column header, a cell, a count — because "does not throw" would pass
 * for a renderer that returns the wrong table.
 */

const ENVELOPE_LABELS = [
  { label: "Saved on", value: "14 November 2023" },
  { label: "armadillo_devices", value: "pixel" },
];

describe("toTableView — the four observed shapes", () => {
  it("reads an array of envelopes, keeping label text verbatim", () => {
    const view = toTableView({
      id: "saved_posts",
      data: [
        { fbid: "1", label_values: ENVELOPE_LABELS, media: [], timestamp: 1_700_000_000 },
        { fbid: "2", label_values: ENVELOPE_LABELS, media: [], timestamp: 1_700_000_100 },
      ],
    });

    expect(view.kind).toBe("table");
    if (view.kind !== "table") return;
    // Not "Saved on (date)", not "Devices" — the export's own words.
    expect(view.columns).toEqual(["Saved on", "armadillo_devices", "timestamp"]);
    expect(view.total).toBe(2);
    expect(view.rows[0]?.[0]).toEqual({ text: "14 November 2023" });
    // The timestamp column shows the date; the raw number is only the title.
    expect(view.rows[1]?.[2]?.text).not.toBe("1700000100");
    expect(view.rows[1]?.[2]?.title).toBe("1700000100");
  });

  it("reads a single envelope object as one row", () => {
    const view = toTableView({
      id: "advertisers_using_your_activity_or_information",
      data: { fbid: "1", label_values: ENVELOPE_LABELS, media: [] },
    });

    expect(view.kind).toBe("table");
    if (view.kind !== "table") return;
    expect(view.total).toBe(1);
    expect(view.rows[0]?.[1]).toEqual({ text: "pixel" });
  });

  it("unwraps a named wrapper and reads the list inside it", () => {
    const view = toTableView({
      id: "threads_viewed",
      data: {
        text_post_app_text_post_app_posts_seen: [
          { string_map_data: { Author: { value: "someone" }, Time: { timestamp: 1_700_000_000 } } },
        ],
      },
    });

    expect(view.kind).toBe("table");
    if (view.kind !== "table") return;
    expect(view.columns).toEqual(["Author", "Time"]);
    expect(view.rows[0]?.[0]).toEqual({ text: "someone" });
    // The date is visible; the raw Unix number is only the hover title.
    expect(view.rows[0]?.[1]?.text).not.toBe("1700000000");
    expect(view.rows[0]?.[1]?.title).toBe("1700000000");
  });

  it("falls back to a tree for a shape with no labels anywhere", () => {
    const data = { some: { deeply: ["nested", 1] } };
    const view = toTableView({ id: "unknown_shape", data });

    expect(view).toEqual({ kind: "tree", value: data });
  });

  it("falls back to a tree for an array of objects that name nothing", () => {
    const data = [{ title: "a" }, { title: "b" }];
    expect(toTableView({ id: "followers", data })).toEqual({ kind: "tree", value: data });
  });
});

describe("toTableView — labels", () => {
  it("reads the vec form of label_values as well as the scalar form", () => {
    const view = toTableView({
      id: "advertisers_using_your_activity_or_information",
      data: {
        fbid: "1",
        media: [],
        label_values: [{ label: "Interests", vec: [{ value: "music" }] }],
      },
    });

    expect(view.kind === "table" && view.rows[0]?.[0]).toEqual({ text: "music" });
  });

  it("repairs mojibake in a label and in a value", () => {
    // "café" double-encoded (ADR 0003): U+00C3 U+00A9.
    const view = toTableView({
      id: "saved_posts",
      data: [
        {
          fbid: "1",
          media: [],
          label_values: [{ label: "caf\u00c3\u00a9", value: "caf\u00c3\u00a9" }],
        },
      ],
    });

    expect(view.kind === "table" && view.columns).toEqual(["café"]);
    expect(view.kind === "table" && view.rows[0]?.[0]).toEqual({ text: "café" });
  });

  it("keeps a string_map_data key as the header, word for word", () => {
    const view = toTableView({
      id: "post_comments",
      data: [{ string_map_data: { "Media Owner": { value: "x" }, Comment: { value: "y" } } }],
    });

    expect(view.kind === "table" && view.columns).toEqual(["Media Owner", "Comment"]);
  });
});

describe("toTableView — edges", () => {
  it("renders an empty category as a table with measured columns, not a tree", () => {
    const view = toTableView({ id: "posts_viewed", data: [] });

    expect(view.kind).toBe("table");
    if (view.kind !== "table") return;
    expect(view.total).toBe(0);
    expect(view.rows).toEqual([]);
    expect(view.columns.length).toBeGreaterThan(0);
    // The measured keys that are not labels are not invented into headers.
    expect(view.columns).not.toContain("fbid");
  });

  it("paginates a thousand rows as ten pages of a hundred", () => {
    const data = Array.from({ length: 1000 }, (_, index) => ({
      fbid: String(index),
      media: [],
      label_values: [{ label: "Value", value: index }],
    }));
    const view = toTableView({ id: "liked_posts", data });

    expect(view.kind).toBe("table");
    if (view.kind !== "table") return;
    expect(view.total).toBe(1000);
    expect(Math.ceil(view.total / PAGE_SIZE)).toBe(10);
    expect(view.rows[998]?.[0]).toEqual({ text: "998" });
  });

  it("never mutates the payload", () => {
    const data = [
      { fbid: "1", media: [], label_values: [{ label: "A", value: "a" }], timestamp: 1 },
    ];
    const frozen = structuredClone(data);
    Object.freeze(data[0]);
    Object.freeze(data[0]?.label_values);

    toTableView({ id: "saved_posts", data });

    expect(data).toEqual(frozen);
  });
});

describe("toTableView — a category fed by several files", () => {
  it("concatenates rows when every source file is a list", () => {
    const view = toTableView({
      id: "saved_posts",
      data: [
        { fbid: "1", media: [], label_values: [{ label: "A", value: "a" }] },
        { fbid: "2", media: [], label_values: [{ label: "B", value: "b" }] },
      ],
      sources: [
        { path: "saved_1.json", entryCount: 1, kind: "array" },
        { path: "saved_2.json", entryCount: 1, kind: "array" },
      ],
    });

    expect(view.kind).toBe("table");
    if (view.kind !== "table") return;
    expect(view.total).toBe(2);
    expect(view.columns).toEqual(["A", "B"]);
  });

  it("falls back to a tree when one file cannot be read as a table", () => {
    // The measured follow_requests_you've_received shape: a list plus an object.
    const data = [
      [{ fbid: "1", media: [], label_values: [{ label: "A", value: "a" }] }],
      { text_post_app_follow_requests: [{ string_list_data: [{ value: "x" }] }] },
    ];
    const view = toTableView({
      id: "follow_requests_you've_received",
      data,
      sources: [
        { path: "connections/follow_requests_you've_received.json", entryCount: 1, kind: "array" },
        { path: "threads/follow_requests_you've_received.json", entryCount: 1, kind: "object" },
      ],
    });

    // The unreadable half must not be hidden behind a table built from the other.
    expect(view).toEqual({ kind: "tree", value: data });
  });
});
