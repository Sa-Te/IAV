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

  it("counts conversations, not inner messages, for the thread categories", () => {
    const record = {
      data: [{ messages: [{ content: "a" }, { content: "b" }] }, { messages: [{ content: "c" }] }],
      entryCount: 3,
      sources: [
        { path: "messages/inbox/a/message_1.json", entryCount: 2, kind: "object" as const },
        { path: "messages/inbox/b/message_1.json", entryCount: 1, kind: "object" as const },
      ],
    };

    // The stored count is the three messages; the screen shows two conversations.
    expect(entryCountForView("messages_inbox", record)).toBe(2);
    expect(entryCountForView("messages_requests", record)).toBe(2);
    expect(record.entryCount).toBe(3);
  });

  it("counts a thread's two files as one conversation", () => {
    const record = {
      data: [{ messages: [{ content: "a" }] }, { messages: [{ content: "b" }] }],
      entryCount: 2,
      sources: [
        { path: "messages/inbox/a/message_1.json", entryCount: 1, kind: "object" as const },
        { path: "messages/inbox/a/message_2.json", entryCount: 1, kind: "object" as const },
      ],
    };

    expect(entryCountForView("messages_inbox", record)).toBe(1);
  });
});
