import { describe, expect, it } from "vitest";

import { shortcodeOf, toEventListView } from "./eventListView.js";

const at = (iso: string): number => Math.floor(new Date(iso).getTime() / 1000);

function event(
  timestamp: number | null,
  items: readonly Record<string, unknown>[],
): Record<string, unknown> {
  return {
    ...(timestamp === null ? {} : { timestamp }),
    media: [],
    label_values: items,
  };
}

describe("shortcodeOf", () => {
  it("reads a post, a reel and a tv shortcode, with or without a query string", () => {
    expect(shortcodeOf("https://www.instagram.com/p/De1mMaNF7pZ/")).toBe("De1mMaNF7pZ");
    expect(shortcodeOf("https://www.instagram.com/reel/ABC123/?utm_source=x")).toBe("ABC123");
    expect(shortcodeOf("https://www.instagram.com/tv/XYZ789")).toBe("XYZ789");
  });

  it("returns null for a profile or website URL", () => {
    expect(shortcodeOf("https://www.instagram.com/someone/")).toBeNull();
    expect(shortcodeOf("https://example.com/article")).toBeNull();
  });
});

describe("toEventListView — grouping", () => {
  it("groups by month descending, newest month first, days descending", () => {
    const view = toEventListView({
      data: [
        event(at("2026-10-15T12:00:00Z"), [{ label: "Name", value: "october" }]),
        event(at("2026-11-10T12:00:00Z"), [{ label: "Name", value: "nov-10" }]),
        event(at("2026-11-15T12:00:00Z"), [{ label: "Name", value: "nov-15" }]),
      ],
    });

    expect(view).not.toBeNull();
    if (view === null) return;
    expect(view.hasTimestamps).toBe(true);
    expect(view.total).toBe(3);
    expect(view.months).toHaveLength(2);
    expect((view.months[0]?.key ?? "") > (view.months[1]?.key ?? "")).toBe(true);
    expect(view.months[0]?.entryCount).toBe(2);
    expect(view.months[0]?.days).toHaveLength(2);
    expect((view.months[0]?.days[0]?.key ?? "") > (view.months[0]?.days[1]?.key ?? "")).toBe(true);
    expect(view.months[0]?.days[0]?.entries[0]?.hero?.text).toBe("nov-15");
  });

  it("counts days and entries for the month button", () => {
    const view = toEventListView({
      data: [
        event(at("2026-11-15T12:00:00Z"), [{ label: "Name", value: "a" }]),
        event(at("2026-11-15T13:00:00Z"), [{ label: "Name", value: "b" }]),
        event(at("2026-11-10T12:00:00Z"), [{ label: "Name", value: "c" }]),
      ],
    });
    expect(view?.months[0]?.entryCount).toBe(3);
    expect(view?.months[0]?.days).toHaveLength(2);
  });
});

describe("toEventListView — the measured role mapping", () => {
  it("uses Caption before Title, and falls back through the priority", () => {
    const view = toEventListView({
      data: [
        event(at("2026-11-15T12:00:00Z"), [
          { label: "Caption", value: "caption" },
          { label: "Title", value: "title" },
        ]),
      ],
    });
    expect(view?.months[0]?.days[0]?.entries[0]?.hero).toEqual({
      label: "Caption",
      text: "caption",
    });
  });

  it("does not repeat a second value under the hero's label as a field", () => {
    const view = toEventListView({
      data: [
        event(at("2026-11-15T12:00:00Z"), [
          { label: "Caption", value: "caption" },
          { label: "Caption", value: "a second caption value" },
        ]),
      ],
    });
    expect(view?.months[0]?.days[0]?.entries[0]?.fields).toEqual([]);
  });

  it("has no hero when only Type is present", () => {
    const view = toEventListView({
      data: [
        event(at("2026-11-15T12:00:00Z"), [
          { label: "Type", value: "something" },
          { label: "IP address", value: "203.0.113.10" },
        ]),
      ],
    });
    expect(view?.months[0]?.days[0]?.entries[0]?.hero).toBeNull();
  });

  it("reads the title and timestamp of a string_list_data entry", () => {
    const view = toEventListView({
      data: [
        {
          title: "A search",
          string_list_data: [
            { href: "https://www.instagram.com/someone/", timestamp: at("2026-11-15T12:00:00Z") },
          ],
        },
      ],
    });
    const entry = view?.months[0]?.days[0]?.entries[0];
    expect(entry?.hero).toEqual({ label: "title", text: "A search" });
    expect(entry?.url).toBe("https://www.instagram.com/someone/");
    expect(entry?.shortcode).toBeNull();
    expect(entry?.timestamp).toBe(at("2026-11-15T12:00:00Z"));
  });
});

describe("toEventListView — URL and fields", () => {
  it("extracts the URL and shortcode, and keeps the remaining fields", () => {
    const view = toEventListView({
      data: [
        event(at("2026-11-15T12:00:00Z"), [
          { label: "Caption", value: "a caption" },
          { label: "URL", href: "https://www.instagram.com/p/De1mMaNF7pZ/", value: "" },
          { label: "IP address", value: "203.0.113.10" },
          { label: "Title", value: "" },
          { label: "Missing" },
          { label: "Group", dict: [] },
        ]),
      ],
    });
    const entry = view?.months[0]?.days[0]?.entries[0];
    expect(entry?.url).toBe("https://www.instagram.com/p/De1mMaNF7pZ/");
    expect(entry?.shortcode).toBe("De1mMaNF7pZ");
    expect(entry?.hero?.text).toBe("a caption");
    // Caption, URL, empty Title, bare Missing and empty Group are not fields.
    expect(entry?.fields.map((field) => field.label)).toEqual(["IP address"]);
  });

  it("renders no URL and no shortcode when the entry has none", () => {
    const view = toEventListView({
      data: [event(at("2026-11-15T12:00:00Z"), [{ label: "Search", value: "a query" }])],
    });
    const entry = view?.months[0]?.days[0]?.entries[0];
    expect(entry?.url).toBeNull();
    expect(entry?.shortcode).toBeNull();
  });

  it("uses a string-map timestamp when the value is empty", () => {
    const view = toEventListView({
      data: [
        {
          string_map_data: {
            Time: { href: "", value: "", timestamp: at("2026-11-15T12:00:00Z") },
            "IP Address": { href: "", value: "203.0.113.10", timestamp: 0 },
          },
        },
      ],
    });
    const entry = view?.months[0]?.days[0]?.entries[0];
    expect(entry?.timestamp).toBe(at("2026-11-15T12:00:00Z"));
    expect(entry?.fields.map((field) => field.label)).toEqual(["IP Address"]);
  });
});

describe("toEventListView — edges", () => {
  it("falls back to a plain list when no entry has a timestamp", () => {
    const view = toEventListView({
      data: [event(null, [{ label: "Name", value: "a" }])],
    });
    expect(view?.hasTimestamps).toBe(false);
    expect(view?.months).toEqual([]);
    expect(view?.undated).toHaveLength(1);
  });

  it("treats an empty array as a present category with no entries", () => {
    expect(toEventListView({ data: [] })).toEqual({
      kind: "event-list",
      months: [],
      undated: [],
      total: 0,
      hasTimestamps: false,
    });
  });

  it("returns null for a record that is not a list of labelled entries", () => {
    expect(toEventListView({ data: [{ foo: "bar" }] })).toBeNull();
    expect(toEventListView({ data: undefined })).toBeNull();
  });
});
