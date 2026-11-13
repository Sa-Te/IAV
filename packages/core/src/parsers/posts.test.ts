import { describe, expect, it } from "vitest";

import { parsePosts } from "./posts.js";

/**
 * Real-shaped fixtures for the two measured `posts` shapes (docs/T3-DESIGN.md §2).
 * The overlap is the point: `posts_1.json` carries 51 legacy media records and
 * `posts.json` carries those same 51 plus 27 more, so an additive merge produces
 * 129 entries for 78 posts.
 */

const legacy = {
  media: [
    {
      uri: "media/posts/201506/one.jpg",
      creation_timestamp: 1434299102,
      title: "an old caption",
      cross_post_source: { source_app: "FB" },
    },
  ],
};

const envelope = {
  fbid: "17841521815067502",
  timestamp: 1707395625,
  media: [],
  label_values: [
    {
      label: "Media",
      media: [{ uri: "media/posts/201506/one.jpg", creation_timestamp: 1434299102 }],
    },
    { label: "Caption", value: "an old caption" },
    { label: "Expiry time", timestamp_value: 0 },
    { label: "Name", value: "not a hero for posts" },
    { dict: [], title: "Owner" },
  ],
};

const envelopeOnly = {
  fbid: "17910351773909186",
  timestamp: 1707395624,
  media: [],
  label_values: [
    {
      label: "Media",
      media: [
        {
          uri: "media/posts/17910351773909186.webp",
          creation_timestamp: 1707395624,
          title: "",
        },
      ],
    },
    { label: "Caption", value: "a newer caption" },
  ],
};

describe("parsePosts — the two measured shapes", () => {
  it("reads a legacy group, caption from the media record", () => {
    const parsed = parsePosts([legacy]);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data).toEqual([
      { id: "media/posts/201506/one.jpg", caption: "an old caption", takenAt: 1434299102 },
    ]);
  });

  it("reads a label/value envelope, caption from the Caption label", () => {
    const parsed = parsePosts([envelopeOnly]);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data).toEqual([
      { id: "media/posts/17910351773909186.webp", caption: "a newer caption", takenAt: 1707395624 },
    ]);
  });

  it("counts a media URI once when both shapes describe the same post", () => {
    const parsed = parsePosts([legacy, envelope, envelopeOnly, { ...legacy }]);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.map((post) => post.id)).toEqual([
      "media/posts/201506/one.jpg",
      "media/posts/17910351773909186.webp",
    ]);
    expect(parsed.warnings).toEqual([]);
  });

  it("keeps a caption a duplicate record supplies when the first had none", () => {
    const bare = { media: [{ uri: "media/posts/x.jpg", creation_timestamp: 1, title: "" }] };
    const richer = {
      timestamp: 2,
      label_values: [
        { label: "Media", media: [{ uri: "media/posts/x.jpg", creation_timestamp: 1 }] },
        { label: "Caption", value: "filled in later" },
      ],
    };

    const parsed = parsePosts([bare, richer]);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.map((post) => post.caption)).toEqual(["filled in later"]);
  });

  it("keeps readable entries when one entry matches neither shape", () => {
    const parsed = parsePosts([legacy, { nope: true }, 42]);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data).toHaveLength(1);
    expect(parsed.warnings.map((warning) => warning.code)).toEqual(["posts-unreadable-entry"]);
    expect(parsed.warnings[0]?.detail).toContain("2 posts entries");
  });
});

describe("parsePosts — negative cases", () => {
  it("refuses a payload that is not an array", () => {
    const parsed = parsePosts({ media: [] });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.reason).toContain("array");
  });

  it("returns no posts for an empty file", () => {
    const parsed = parsePosts([]);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data).toEqual([]);
  });
});
