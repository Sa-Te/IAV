import { describe, expect, it } from "vitest";

import { entryCountForView } from "./entryCount.js";

const legacy = { media: [{ uri: "media/posts/old.jpg", creation_timestamp: 1, title: "" }] };
const envelope = {
  timestamp: 2,
  label_values: [
    { label: "Media", media: [{ uri: "media/posts/old.jpg", creation_timestamp: 1 }] },
    { label: "Caption", value: "same post" },
  ],
};

describe("entryCountForView", () => {
  it("reports the posts the gallery shows, not the per-file sum", () => {
    // Two files, 2 raw entries, one post.
    expect(entryCountForView("posts", { data: [legacy, envelope], entryCount: 2 })).toBe(1);
  });

  it("keeps the stored count when the parser cannot read the record", () => {
    expect(entryCountForView("posts", { data: { media: [] }, entryCount: 7 })).toBe(7);
  });

  it("leaves every other category on its stored count", () => {
    expect(entryCountForView("stories", { data: [legacy, envelope], entryCount: 209 })).toBe(209);
  });
});
