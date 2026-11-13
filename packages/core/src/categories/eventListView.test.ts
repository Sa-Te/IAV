import { describe, expect, it } from "vitest";

import {
  groupByMonthAndYear,
  shortcodeOf,
  toEventListView,
  type EventEntry,
} from "./eventListView.js";

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
      years: [],
      showYears: false,
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

describe("groupByMonthAndYear — the year level", () => {
  const entry = (timestamp: number, hero: string): EventEntry => ({
    ordinal: timestamp,
    timestamp,
    date: `date ${timestamp}`,
    hero: { label: "Name", text: hero },
    url: null,
    shortcode: null,
    fields: [],
  });

  /** One entry on the first of each month, oldest first, for `count` months back. */
  function monthly(count: number, end = "2026-10"): EventEntry[] {
    const endYear = Number(end.slice(0, 4));
    const endMonth = Number(end.slice(5, 7));
    return Array.from({ length: count }, (_, index) => {
      const offset = count - 1 - index;
      const total = endYear * 12 + (endMonth - 1) - offset;
      const year = Math.floor(total / 12);
      const month = (total % 12) + 1;
      return entry(Date.UTC(year, month - 1, 1) / 1000, `${year}-${month}`);
    });
  }

  it("does not engage below 25 months, so a short list looks as it did", () => {
    const grouping = groupByMonthAndYear(monthly(12));

    expect(grouping.spanMonths).toBe(12);
    expect(grouping.showYears).toBe(false);
    expect(grouping.years).toEqual([]);
    expect(grouping.months).toHaveLength(12);
  });

  it("engages at a 30-month span", () => {
    const grouping = groupByMonthAndYear(monthly(30));

    expect(grouping.spanMonths).toBe(30);
    expect(grouping.showYears).toBe(true);
    expect(grouping.years.length).toBeGreaterThan(1);
  });

  it("counts empty months inside the range, because the person scrolls the range", () => {
    // January 2024 and October 2026: 34 months apart including the empty ones.
    const grouping = groupByMonthAndYear([
      entry(Date.UTC(2024, 0, 1) / 1000, "old"),
      entry(Date.UTC(2026, 9, 1) / 1000, "new"),
    ]);

    expect(grouping.spanMonths).toBe(34);
    expect(grouping.showYears).toBe(true);
    expect(grouping.months).toHaveLength(2);
    expect(grouping.years.reduce((sum, year) => sum + year.monthCount, 0)).toBe(2);
  });

  it("orders years and months newest first", () => {
    const grouping = groupByMonthAndYear(monthly(30));

    const yearKeys = grouping.years.map((year) => year.key);
    expect(yearKeys).toEqual([...yearKeys].sort().reverse());
    for (const year of grouping.years) {
      const keys = year.months.map((month) => month.key);
      expect(keys).toEqual([...keys].sort().reverse());
    }
    expect(grouping.months[0]?.key).toBe("2026-10");
  });

  it("sums each year's months, and the years add up to the flat list", () => {
    const grouping = groupByMonthAndYear(monthly(30));

    expect(grouping.years.reduce((sum, year) => sum + year.entryCount, 0)).toBe(30);
    const first = grouping.years[0];
    expect(first?.label).toBe(first?.key);
    expect(first?.monthCount).toBe(first?.months.length);
  });

  it("is deterministic and does not mutate its input", () => {
    const entries = monthly(30);
    const snapshot = entries.map((value) => value.timestamp);

    const first = groupByMonthAndYear(entries);
    const second = groupByMonthAndYear([...entries].reverse());

    expect(entries.map((value) => value.timestamp)).toEqual(snapshot);
    expect(second.months).toEqual(first.months);
    expect(second.years).toEqual(first.years);
  });

  it("says nothing about years when there are no dated entries", () => {
    const grouping = groupByMonthAndYear([]);

    expect(grouping).toEqual({ months: [], years: [], spanMonths: 0, showYears: false });
  });
});
