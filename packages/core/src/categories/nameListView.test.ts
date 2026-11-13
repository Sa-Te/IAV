import { describe, expect, it } from "vitest";

import { toNameListView } from "./nameListView.js";

function entry(items: readonly Record<string, unknown>[]): Record<string, unknown> {
  return { media: [], label_values: items };
}

describe("toNameListView", () => {
  it("reads a vec of names and an explanatory text value", () => {
    const view = toNameListView({
      data: entry([
        { label: "Names", vec: [{ value: "a" }, { value: "b" }, { value: "c" }] },
        { label: "Explanation", value: "why" },
      ]),
    });

    expect(view?.total).toBe(3);
    expect(view?.sections[0]).toEqual({ label: "Names", names: ["a", "b", "c"] });
    expect(view?.sections[1]).toEqual({ label: "Explanation", names: [], text: "why" });
  });

  it("keeps a large name list whole; the screen paginates it", () => {
    const names = Array.from({ length: 250 }, (_, index) => ({ value: `name-${index}` }));
    const view = toNameListView({ data: entry([{ label: "Names", vec: names }]) });
    expect(view?.total).toBe(250);
    expect(view?.sections[0]?.names).toHaveLength(250);
  });

  it("returns null when there is no vec or text to list", () => {
    expect(toNameListView({ data: entry([{ label: "Empty", vec: [] }]) })).toBeNull();
    expect(toNameListView({ data: entry([{ label: "Bare" }]) })).toBeNull();
    expect(toNameListView({ data: [{ foo: "bar" }] })).toBeNull();
  });
});
