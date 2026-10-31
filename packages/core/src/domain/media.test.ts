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
