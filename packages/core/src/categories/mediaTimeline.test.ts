import { describe, expect, it } from "vitest";

import type { MediaItemView } from "../domain/media.js";
import { toMediaTimeline } from "./mediaTimeline.js";

const AT = (year: number, month: number, day: number): number =>
  Date.UTC(year, month - 1, day, 12) / 1000;

function item(id: string, takenAt: number): MediaItemView {
  return { id, caption: id, takenAt, category: "posts" };
}

const items = [
  item("old", AT(2020, 1, 1)),
  item("new", AT(2022, 5, 2)),
  item("undated-a", 0),
  item("same-month", AT(2022, 5, 1)),
  item("undated-b", 0),
];

describe("toMediaTimeline", () => {
  it("groups by year then month, newest first", () => {
    const timeline = toMediaTimeline(items);

    expect(timeline.years.map((year) => year.key)).toEqual(["2022", "2020"]);
    expect(timeline.years[0]?.months.map((month) => month.key)).toEqual(["2022-05"]);
    expect(timeline.years[0]?.months[0]?.items.map((entry) => entry.item.id)).toEqual([
      "new",
      "same-month",
    ]);
    expect(timeline.years[1]?.months[0]?.items[0]?.item.id).toBe("old");
  });

  it("keeps undated items in a final group and never drops them", () => {
    const timeline = toMediaTimeline(items);

    expect(timeline.undated.map((entry) => entry.item.id)).toEqual(["undated-a", "undated-b"]);
    expect(timeline.total).toBe(5);
    expect(
      timeline.years.reduce(
        (sum, year) => sum + year.months.reduce((n, month) => n + month.items.length, 0),
        0,
      ) + timeline.undated.length,
    ).toBe(5);
  });

  it("keeps the original index for the detail view", () => {
    const timeline = toMediaTimeline(items);
    expect(timeline.years[0]?.months[0]?.items[0]).toEqual({ item: items[1], index: 1 });
  });

  it("is deterministic for the same input", () => {
    expect(toMediaTimeline(items)).toEqual(toMediaTimeline(items));
  });

  it("returns empty groups for an empty list", () => {
    expect(toMediaTimeline([])).toEqual({ years: [], undated: [], total: 0 });
  });

  it("puts everything in undated when no item carries a date", () => {
    expect(toMediaTimeline([item("a", 0), item("b", 0)]).years).toEqual([]);
  });
});
