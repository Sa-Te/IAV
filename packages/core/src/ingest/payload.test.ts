import { describe, expect, it } from "vitest";

import { entryCountOf, mergePayloads } from "./payload.js";

describe("entryCountOf", () => {
  it("counts a single label/value envelope as one entry, not one per label", () => {
    expect(
      entryCountOf({ fbid: "1", media: [], label_values: [{ label: "A" }, { label: "B" }] }),
    ).toBe(1);
    // The reported bug: empty labels used to make the whole category look empty.
    expect(entryCountOf({ fbid: "1", media: [], label_values: [] })).toBe(1);
  });

  it("still counts a named wrapper by the list it wraps", () => {
    expect(entryCountOf({ ig_stories: [{}, {}] })).toBe(2);
  });

  it("counts a bare array by its length and an object with no list as zero", () => {
    expect(entryCountOf([1, 2, 3])).toBe(3);
    expect(entryCountOf({ fbid: "1" })).toBe(0);
    expect(entryCountOf(null)).toBe(0);
  });
});

describe("mergePayloads", () => {
  it("concatenates lists, keeping every entry", () => {
    expect(mergePayloads([[1, 2], [3]])).toEqual([1, 2, 3]);
  });

  it("keeps one payload per file when the containers disagree", () => {
    const array = [{ fbid: "1" }];
    const object = { text_post_app_seen: [{ value: "x" }] };

    // Not a deep merge: that would keep one shape and drop the other.
    expect(mergePayloads([array, object])).toEqual([array, object]);
  });

  it("never folds two objects into one, because that overwrites keys", () => {
    const a = { title: "first", messages: [1] };
    const b = { title: "second", messages: [2] };

    expect(mergePayloads([a, b])).toEqual([a, b]);
  });

  it("returns the payload itself when there is one file", () => {
    const value = { ig_stories: [] };
    expect(mergePayloads([value])).toBe(value);
  });

  it("returns undefined for no files rather than an empty shell", () => {
    expect(mergePayloads([])).toBeUndefined();
  });
});
