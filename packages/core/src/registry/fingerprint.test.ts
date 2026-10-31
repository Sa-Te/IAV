import { describe, expect, it } from "vitest";

import { computeFingerprint } from "./fingerprint.js";

describe("computeFingerprint", () => {
  const base = [
    { id: "posts", keys: ["media", "title"] },
    { id: "stories", keys: ["uri", "creation_timestamp"] },
  ];

  it("is stable for identical input", () => {
    expect(computeFingerprint(base)).toBe(computeFingerprint(base));
  });

  it("ignores the order of categories and of keys", () => {
    const reordered = [
      { id: "stories", keys: ["creation_timestamp", "uri"] },
      { id: "posts", keys: ["title", "media"] },
    ];
    expect(computeFingerprint(reordered)).toBe(computeFingerprint(base));
  });

  it("changes when a key changes", () => {
    const changed = [
      { id: "posts", keys: ["media", "caption"] },
      { id: "stories", keys: ["uri", "creation_timestamp"] },
    ];
    expect(computeFingerprint(changed)).not.toBe(computeFingerprint(base));
  });

  it("changes when a category disappears", () => {
    expect(computeFingerprint([base[0] ?? { id: "", keys: [] }])).not.toBe(
      computeFingerprint(base),
    );
  });

  it("returns a defined value for an empty archive", () => {
    const empty = computeFingerprint([]);
    expect(empty).toMatch(/^fmt-[0-9a-f]{6}$/);
    expect(computeFingerprint([])).toBe(empty);
  });

  it("always looks like fmt-xxxxxx", () => {
    expect(computeFingerprint(base)).toMatch(/^fmt-[0-9a-f]{6}$/);
  });
});
