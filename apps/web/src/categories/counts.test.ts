import { describe, expect, it } from "vitest";

import { describeCounts, pluralCount, primaryCount } from "./counts.js";

describe("pluralCount", () => {
  it("is singular only at one", () => {
    expect(pluralCount(1, "entry", "entries")).toBe("1 entry");
    expect(pluralCount(2, "entry", "entries")).toBe("2 entries");
    expect(pluralCount(0, "entry", "entries")).toBe("0 entries");
    expect(pluralCount(1000, "entry", "entries")).toBe("1,000 entries");
  });

  it("uses the default plural for regular nouns", () => {
    expect(pluralCount(1, "media item")).toBe("1 media item");
    expect(pluralCount(2, "media item")).toBe("2 media items");
    expect(pluralCount(0, "media item")).toBe("0 media items");
    expect(pluralCount(1000, "media item")).toBe("1,000 media items");
  });
});

describe("primaryCount", () => {
  it("prefers media, falls back to entries, and says nothing when both are zero", () => {
    expect(primaryCount({ entries: 3, media: 2 })).toBe("2 media items");
    expect(primaryCount({ entries: 1, media: 0 })).toBe("1 entry");
    expect(primaryCount({ entries: 2, media: 0 })).toBe("2 entries");
    expect(primaryCount({ entries: 0, media: 0 })).toBeNull();
  });
});

describe("describeCounts", () => {
  it("labels both units when both exist", () => {
    expect(describeCounts({ entries: 3, media: 2 })).toBe("3 entries · 2 media items");
  });

  it("never prints a bare zero", () => {
    expect(describeCounts({ entries: 1, media: 0 })).toBe("1 entry");
    expect(describeCounts({ entries: 0, media: 1 })).toBe("1 media item");
    expect(describeCounts({ entries: 0, media: 0 })).toBeNull();
  });
});
