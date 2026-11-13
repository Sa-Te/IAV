import { describe, expect, it } from "vitest";

import { toMediaItems } from "./media.js";

/**
 * A message category arrives as one file per thread and is merged additively
 * into a list of thread payloads (M8). Before that change the merge folded the
 * threads into one object, so only the last thread's shape survived.
 */
describe("toMediaItems — messages merged from several files", () => {
  const thread = (name: string, uri: string): unknown => ({
    title: name,
    thread_path: `inbox/${name}`,
    participants: [],
    messages: [{ sender_name: "fixture", timestamp_ms: 1000, photos: [{ uri }] }],
  });

  it("collects media from every thread payload, not just one", () => {
    const items = toMediaItems("messages_inbox", [
      thread("first", "media/first.jpg"),
      thread("second", "media/second.jpg"),
    ]);

    expect(items.map((item) => item.id)).toEqual(["media/first.jpg", "media/second.jpg"]);
  });

  it("still reads a single thread file that was never merged", () => {
    const items = toMediaItems("messages_inbox", thread("only", "media/only.jpg"));

    expect(items).toHaveLength(1);
  });

  it("returns nothing for a payload that is not a thread, without throwing", () => {
    expect(toMediaItems("messages_inbox", [{ nope: true }, 42, null])).toEqual([]);
  });
});

/**
 * M22: one export can carry the same posts twice, as legacy groups and as
 * label/value envelopes. The gallery must show the posts, not the files.
 */
describe("toMediaItems — posts measured in two shapes at once", () => {
  const legacy = {
    media: [{ uri: "media/posts/old.jpg", creation_timestamp: 1434299102, title: "old" }],
  };
  const envelope = {
    timestamp: 1707395625,
    label_values: [
      {
        label: "Media",
        media: [{ uri: "media/posts/old.jpg", creation_timestamp: 1434299102, title: "" }],
      },
      { label: "Caption", value: "old" },
    ],
  };

  it("counts a post once when both shapes describe it", () => {
    const items = toMediaItems("posts", [legacy, envelope]);

    expect(items.map((item) => item.id)).toEqual(["media/posts/old.jpg"]);
  });

  it("reads a label/value envelope whose media is nested under the Media label", () => {
    const items = toMediaItems("posts", [
      {
        timestamp: 1707395625,
        label_values: [
          {
            label: "Media",
            media: [{ uri: "media/posts/new.jpg", creation_timestamp: 1707395625 }],
          },
          { label: "Caption", value: "newer" },
        ],
      },
    ]);

    expect(items).toEqual([
      { id: "media/posts/new.jpg", caption: "newer", takenAt: 1707395625, category: "posts" },
    ]);
  });

  it("returns nothing for a payload that is not an array of posts", () => {
    expect(toMediaItems("posts", { media: [] })).toEqual([]);
  });
});
