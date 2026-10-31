import { describe, expect, it } from "vitest";

import { mergePayloads } from "./payload.js";

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
