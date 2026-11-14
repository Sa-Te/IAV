import { describe, expect, it } from "vitest";

import type { CategoryRecord } from "../ingest/port.js";
import {
  isAttachmentPlaceholder,
  locateThread,
  sortThreads,
  toThreadSummaries,
  toThreadSummary,
} from "./threads.js";

/** Three synthetic files: two inbox threads, one request thread. Never real data. */
function messageRecord(): CategoryRecord {
  return {
    id: "messages_inbox",
    resolvedTier: 1,
    entryCount: 5,
    data: [
      {
        participants: [{ name: "alice" }, { name: "you" }],
        title: "alice",
        messages: [
          { sender_name: "alice", timestamp_ms: 1_000, photos: [{ uri: "a.jpg" }] },
          { sender_name: "you", timestamp_ms: 2_000, content: "hi" },
        ],
      },
      {
        participants: [{ name: "bob" }],
        messages: [],
      },
    ],
    sources: [
      {
        path: "your_instagram_activity/messages/inbox/alice/message_1.json",
        entryCount: 2,
        kind: "object",
      },
      {
        path: "your_instagram_activity/messages/inbox/bob/message_1.json",
        entryCount: 0,
        kind: "object",
      },
    ],
    warnings: [],
  };
}

function requestsRecord(): CategoryRecord {
  return {
    id: "messages_requests",
    resolvedTier: 1,
    entryCount: 1,
    data: {
      participants: [{ name: "carol" }],
      messages: [{ sender_name: "carol", timestamp_ms: 5_000, videos: [{ uri: "c.mp4" }] }],
    },
    sources: [
      {
        path: "your_instagram_activity/messages/message_requests/carol/message_1.json",
        entryCount: 1,
        kind: "object",
      },
    ],
    warnings: [],
  };
}

describe("locateThread", () => {
  it("finds the family and the thread folder from the path alone", () => {
    expect(locateThread("your_instagram_activity/messages/inbox/abc/message_1.json")).toEqual({
      family: "inbox",
      folder: "abc",
    });
    expect(
      locateThread("your_instagram_activity/messages/message_requests/abc/message_1.json"),
    ).toEqual({ family: "message_requests", folder: "abc" });
  });

  it("returns null when the file is not under a message family", () => {
    expect(locateThread("your_instagram_activity/media/posts_1.json")).toBeNull();
  });
});

describe("toThreadSummaries", () => {
  it("builds one summary per thread with folder, count, participants and newest stamp", () => {
    const threads = toThreadSummaries(messageRecord());

    expect(threads.map((thread) => thread.id)).toEqual(["inbox/alice", "inbox/bob"]);
    expect(threads[0]).toMatchObject({
      folder: "inbox",
      participants: ["alice", "you"],
      messageCount: 2,
      newestTimestamp: 2_000,
      oldestTimestamp: 1_000,
      mediaCount: 1,
      hasTitle: true,
    });
  });

  it("keeps a thread with no messages, marked empty rather than dropped", () => {
    const empty = toThreadSummaries(messageRecord()).find((thread) => thread.id === "inbox/bob");

    expect(empty).toBeDefined();
    expect(empty?.messageCount).toBe(0);
    expect(empty?.newestTimestamp).toBeNull();
    expect(empty?.participants).toEqual(["bob"]);
  });

  it("does not throw when a thread has no participant list", () => {
    const record = messageRecord();
    const noParticipants = {
      ...record,
      data: [{ messages: [{ timestamp_ms: 1 }] }],
      sources: [
        {
          path: "your_instagram_activity/messages/inbox/x/message_1.json",
          entryCount: 1,
          kind: "object" as const,
        },
      ],
    };

    expect(toThreadSummaries(noParticipants)[0]?.participants).toEqual([]);
  });

  it("merges two files that share a folder into one thread", () => {
    const record = messageRecord();
    const split: CategoryRecord = {
      ...record,
      data: [
        { participants: [{ name: "alice" }], messages: [{ timestamp_ms: 1_000 }] },
        { messages: [{ timestamp_ms: 3_000 }] },
      ],
      sources: [
        {
          path: "your_instagram_activity/messages/inbox/alice/message_1.json",
          entryCount: 1,
          kind: "object",
        },
        {
          path: "your_instagram_activity/messages/inbox/alice/message_2.json",
          entryCount: 1,
          kind: "object",
        },
      ],
    };

    const threads = toThreadSummaries(split);

    expect(threads).toHaveLength(1);
    expect(threads[0]?.messageCount).toBe(2);
    expect(threads[0]?.newestTimestamp).toBe(3_000);
  });

  it("keeps the same folder name apart when it appears under both families", () => {
    const record = messageRecord();
    const both: CategoryRecord = {
      ...record,
      data: [
        { messages: [{ timestamp_ms: 1 }] },
        { messages: [{ timestamp_ms: 2 }], is_pending: true },
      ],
      sources: [
        {
          path: "your_instagram_activity/messages/inbox/same/message_1.json",
          entryCount: 1,
          kind: "object",
        },
        {
          path: "your_instagram_activity/messages/message_requests/same/message_1.json",
          entryCount: 1,
          kind: "object",
        },
      ],
    };

    expect(toThreadSummaries(both).map((thread) => thread.id)).toEqual([
      "message_requests/same",
      "inbox/same",
    ]);
  });
});

describe("ordering", () => {
  it("puts the newest thread first and breaks ties on id", () => {
    const thread = (id: string, newest: number | null) => ({
      id,
      folder: "inbox" as const,
      participants: [],
      messageCount: 1,
      newestTimestamp: newest,
      oldestTimestamp: newest,
      mediaCount: 0,
      hasTitle: false,
    });

    const ordered = sortThreads([
      thread("inbox/old", 1_000),
      thread("inbox/b", 9_000),
      thread("inbox/a", 9_000),
      thread("inbox/empty", null),
    ]);

    expect(ordered.map((item) => item.id)).toEqual([
      "inbox/a",
      "inbox/b",
      "inbox/old",
      "inbox/empty",
    ]);
  });
});

describe("toThreadSummary", () => {
  it("summarises one source file by path, and returns null for an unknown path", () => {
    const record = requestsRecord();
    const summary = toThreadSummary(
      record,
      "your_instagram_activity/messages/message_requests/carol/message_1.json",
    );

    expect(summary).toMatchObject({ id: "message_requests/carol", folder: "message_requests" });
    expect(toThreadSummary(record, "nope.json")).toBeNull();
  });
});

describe("isAttachmentPlaceholder", () => {
  it("recognises the literal lines the export writes when media is absent", () => {
    expect(isAttachmentPlaceholder("You sent an attachment.")).toBe(true);
    expect(isAttachmentPlaceholder("Instagram user sent an attachment.")).toBe(true);
    expect(isAttachmentPlaceholder("  sent an attachment  ")).toBe(true);
  });

  it("does not treat ordinary text as an attachment placeholder", () => {
    expect(isAttachmentPlaceholder("I sent you the file yesterday")).toBe(false);
    expect(isAttachmentPlaceholder("Audio call ended")).toBe(false);
    expect(isAttachmentPlaceholder("")).toBe(false);
  });
});
