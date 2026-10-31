import { describe, expect, it } from "vitest";

import { parseArchivedPosts } from "./archivedPosts.js";
import { parseStories } from "./stories.js";

/** Real-shaped fixtures: the two opaque fields are always `[]` there (manifest §11). */

const STORIES_FIXTURE = {
  ig_stories: [
    {
      uri: "media/stories/202401/one.jpg",
      creation_timestamp: 1700000000,
      title: "first story",
      cross_post_source: { source_app: "FB" },
      media_variants: [],
      dubbing_info: [],
      media_metadata: { video_metadata: { music_genre: "pop" } },
    },
    {
      uri: "media/stories/202401/two.mp4",
      creation_timestamp: 1700000100,
      title: "",
      media_variants: [],
      dubbing_info: [],
    },
  ],
};

const ARCHIVED_FIXTURE = {
  ig_archived_post_media: [
    {
      media: [
        { uri: "media/archived_posts/202001/a.jpg", creation_timestamp: 1600000000, title: "old" },
      ],
    },
    {
      media: [
        { uri: "media/archived_posts/202002/b.jpg", creation_timestamp: 1600000100, title: "" },
        {
          uri: "media/archived_posts/202002/c.jpg",
          creation_timestamp: 1600000200,
          title: "second",
        },
      ],
    },
  ],
};

describe("parseStories", () => {
  it("derives entries from a real-shaped file", () => {
    const result = parseStories(STORIES_FIXTURE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      id: "media/stories/202401/one.jpg",
      caption: "first story",
      takenAt: 1700000000,
      mediaVariants: [],
      dubbingInfo: [],
      sourceApp: "FB",
    });
    // No source_app on the second story.
    expect(result.data[1]?.sourceApp).toBeNull();
  });

  it("counts the media references it produced", () => {
    const result = parseStories(STORIES_FIXTURE);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.map((story) => story.id)).toHaveLength(2);
  });

  it("rejects a malformed file without throwing", () => {
    const result = parseStories({ ig_stories: [{ title: "no uri" }] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("stories.json");
  });

  it("accepts an empty list", () => {
    const result = parseStories({ ig_stories: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(0);
  });

  it("keeps an unknown value verbatim rather than inventing a meaning", () => {
    const result = parseStories({
      ig_stories: [{ uri: "media/s.jpg", creation_timestamp: 1, dubbing_info: [{ voice: "x" }] }],
    });
    if (!result.ok) throw new Error("expected ok");
    expect(result.data[0]?.dubbingInfo).toEqual([{ voice: "x" }]);
  });
});

describe("parseArchivedPosts", () => {
  it("flattens groups into media entries", () => {
    const result = parseArchivedPosts(ARCHIVED_FIXTURE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveLength(3);
    expect(result.data.map((entry) => entry.caption)).toEqual(["old", "", "second"]);
    expect(result.data[2]?.takenAt).toBe(1600000200);
  });

  it("rejects a posts-shaped file with the archived wrapper missing", () => {
    // The trap: archived posts look exactly like posts, so a wrong file must not pass.
    const result = parseArchivedPosts([{ media: [{ uri: "media/p.jpg", creation_timestamp: 1 }] }]);
    expect(result.ok).toBe(false);
  });

  it("accepts an empty archive section", () => {
    const result = parseArchivedPosts({ ig_archived_post_media: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(0);
  });
});
