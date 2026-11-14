import { describe, expect, it } from "vitest";

import { buildIndex, normaliseQuery, search } from "./index.js";

const threads = [
  { id: "inbox/a", messages: ["Hello world", "the cafe is open", "Another line"] },
  {
    id: "inbox/b",
    messages: ["Café  au   lait", "nothing to see here", "a very long message " + "x".repeat(300)],
  },
];

const index = buildIndex(threads);

describe("buildIndex / search", () => {
  it("returns the right thread and message index for an exact match", () => {
    const hits = search(index, "Hello world");
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ threadId: "inbox/a", messageIndex: 0 });
  });

  it("matches a partial word", () => {
    expect(search(index, "caf").map((hit) => hit.threadId)).toContain("inbox/a");
  });

  it("ignores case and diacritics on both query and body", () => {
    expect(search(index, "CAFE").map((hit) => hit.messageIndex)).toContain(1);
    expect(search(index, "café").map((hit) => hit.threadId)).toContain("inbox/b");
    expect(normaliseQuery("  CAFÉ  ")).toBe("cafe");
  });

  it("normalises whitespace", () => {
    const hits = search(index, "au lait");
    expect(hits.map((hit) => hit.threadId)).toContain("inbox/b");
  });

  it("returns nothing for a one-character query", () => {
    expect(search(index, "a")).toEqual([]);
    expect(search(index, "  ")).toEqual([]);
  });

  it("honours the limit", () => {
    const many = buildIndex([
      { id: "inbox/c", messages: ["match one", "match two", "match three"] },
    ]);
    expect(search(many, "match")).toHaveLength(3);
    expect(search(many, "match", 1)).toHaveLength(1);
    expect(search(many, "match", 0)).toEqual([]);
  });

  it("returns an empty list, not an error, for a query with no hits", () => {
    expect(search(index, "zzzzzz")).toEqual([]);
  });

  it("returns a bounded snippet that contains the match", () => {
    const [hit] = search(index, "xxxx");
    expect(hit).toBeDefined();
    if (hit === undefined) return;
    expect(hit.snippet.length).toBeLessThanOrEqual(200);
    expect(hit.snippet).toContain("xxxx");
    expect(hit.matched).toContain("xxxx");
  });

  it("does not return the whole long message as the snippet", () => {
    const [hit] = search(index, "long message");
    expect(hit?.snippet.length).toBeLessThan(200);
    expect(hit?.snippet).toContain("long message");
  });

  it("returns one hit per message", () => {
    const repeated = buildIndex([{ id: "inbox/c", messages: ["same same same"] }]);
    expect(search(repeated, "same")).toHaveLength(1);
  });
});
