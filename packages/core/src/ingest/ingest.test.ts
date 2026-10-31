import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { MemorySink } from "../../test/fakes/memorySink.js";
import { runIngest } from "./ingest.js";

function buildArchive(): Uint8Array {
  return zipSync({
    "posts_1.json": strToU8(
      JSON.stringify([
        { media: [{ uri: "media/posts/202401/one.jpg", creation_timestamp: 1, title: "a" }] },
        { media: [{ uri: "media/posts/202401/two.jpg", creation_timestamp: 2, title: "b" }] },
        { media: [{ uri: "media/posts/202401/missing.jpg", creation_timestamp: 3, title: "c" }] },
      ]),
    ),
    "stories.json": strToU8(
      JSON.stringify({
        ig_stories: [{ uri: "media/stories/202401/s.mp4", creation_timestamp: 4 }],
      }),
    ),
    "messages/inbox/thread_one/message_1.json": strToU8(
      JSON.stringify({
        participants: [{ name: "fixture" }],
        messages: [{ sender_name: "fixture", timestamp_ms: 5, content: "hi" }],
        title: "fixture",
        thread_path: "inbox/thread_one",
        is_still_participant: true,
        magic_words: [],
      }),
    ),
    "broken.json": strToU8("{ this is not json"),
    "unknown.json": strToU8(JSON.stringify({ mystery: [{ alpha: 1, beta: "two" }] })),
    "media/posts/202401/one.jpg": new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
    "media/posts/202401/two.jpg": new Uint8Array([0xff, 0xd8, 0xff, 0xe1]),
    "media/stories/202401/s.mp4": new Uint8Array([0x00, 0x00, 0x00, 0x18]),
  });
}

function advancingClock(step = 3000): () => number {
  let t = 0;
  return () => {
    t += step;
    return t;
  };
}

describe("runIngest — happy path", () => {
  it("stores categories, media and a summary", async () => {
    const sink = new MemorySink();
    const job = await runIngest({ zip: buildArchive(), sink, now: advancingClock() });

    expect(job.status).toBe("ready");
    if (job.status !== "ready") return;

    expect(job.summary.categories).toBe(3);
    expect(job.summary.entries).toBe(5);
    expect(job.summary.mediaStored).toBe(3);
    expect(job.summary.mediaMissing).toBe(1);
    expect(job.summary.unrecognised).toHaveLength(2);
    expect(job.summary.fingerprint).toMatch(/^fmt-[0-9a-f]{6}$/);

    expect([...sink.categories.keys()].sort()).toEqual(["messages_inbox", "posts", "stories"]);
    expect([...sink.media.keys()].sort()).toEqual([
      "media/posts/202401/one.jpg",
      "media/posts/202401/two.jpg",
      "media/stories/202401/s.mp4",
    ]);
    expect(sink.archive?.fingerprint).toBe(job.summary.fingerprint);
  });

  it("records the malformed file as unrecognised instead of throwing", async () => {
    const sink = new MemorySink();
    const job = await runIngest({ zip: buildArchive(), sink, now: advancingClock() });
    if (job.status !== "ready") throw new Error("expected ready");

    const broken = job.summary.unrecognised.find((shape) => shape.basename === "broken.json");
    expect(broken).toBeDefined();
    expect(broken?.kind).toBe("scalar");
  });

  it("records the unknown-shaped file with keys but no content", async () => {
    const sink = new MemorySink();
    const job = await runIngest({ zip: buildArchive(), sink, now: advancingClock() });
    if (job.status !== "ready") throw new Error("expected ready");

    const unknown = job.summary.unrecognised.find((shape) => shape.basename === "unknown.json");
    expect(unknown?.keys).toEqual(["mystery"]);
    expect(unknown?.kind).toBe("object");
  });

  it("counts a broken media reference without throwing", async () => {
    const sink = new MemorySink();
    const job = await runIngest({ zip: buildArchive(), sink, now: advancingClock() });
    if (job.status !== "ready") throw new Error("expected ready");
    expect(job.summary.mediaMissing).toBe(1);
  });

  it("produces a stable fingerprint across two runs", async () => {
    const first = await runIngest({
      zip: buildArchive(),
      sink: new MemorySink(),
      now: advancingClock(),
    });
    const second = await runIngest({
      zip: buildArchive(),
      sink: new MemorySink(),
      now: advancingClock(),
    });
    if (first.status !== "ready" || second.status !== "ready") throw new Error("expected ready");
    expect(first.summary.fingerprint).toBe(second.summary.fingerprint);
  });

  it("changes the fingerprint when the shape changes", async () => {
    const base = await runIngest({
      zip: buildArchive(),
      sink: new MemorySink(),
      now: advancingClock(),
    });
    const other = zipSync({ "stories.json": strToU8(JSON.stringify({ ig_stories: [] })) });
    const changed = await runIngest({ zip: other, sink: new MemorySink(), now: advancingClock() });
    if (base.status !== "ready" || changed.status !== "ready") throw new Error("expected ready");
    expect(changed.summary.fingerprint).not.toBe(base.summary.fingerprint);
  });

  it("reports every phase", async () => {
    const phases = new Set<string>();
    await runIngest({
      zip: buildArchive(),
      sink: new MemorySink(),
      now: advancingClock(),
      onProgress: (job) => {
        if (job.status === "parsing") phases.add(job.phase);
      },
    });
    expect([...phases].sort()).toEqual(["reading", "resolving", "storing"]);
  });
});

describe("runIngest — failure modes", () => {
  it("rejects a text file renamed to .zip", async () => {
    const sink = new MemorySink();
    const job = await runIngest({ zip: strToU8("this is not a zip"), sink });
    expect(job.status).toBe("failed");
    if (job.status !== "failed") return;
    expect(job.reason).toBe("not-a-zip");
    expect(sink.archive).toBeNull();
  });

  it("rejects an HTML export with the re-request message", async () => {
    const sink = new MemorySink();
    const zip = zipSync({
      "content/posts_1.html": strToU8("<html></html>"),
      "content/stories.html": strToU8("<html></html>"),
    });
    const job = await runIngest({ zip, sink });
    expect(job.status).toBe("failed");
    if (job.status !== "failed") return;
    expect(job.reason).toBe("html-export");
    expect(job.detail).toContain("JSON");
    expect(sink.archive).toBeNull();
  });

  it("refuses to start when there is not enough free space", async () => {
    const zip = buildArchive();
    const sink = new MemorySink(1000);
    const job = await runIngest({ zip, sink });
    expect(job.status).toBe("failed");
    if (job.status !== "failed") return;
    expect(job.reason).toBe("insufficient-space");
    expect(job.detail).toMatch(/\d/);
    expect(job.detail).toMatch(/1,000/);
    expect(sink.archive).toBeNull();
    expect(sink.categories.size).toBe(0);
  });

  it("fails as cancelled and leaves no archive record", async () => {
    const controller = new AbortController();
    controller.abort();
    const sink = new MemorySink();
    const job = await runIngest({ zip: buildArchive(), sink, signal: controller.signal });
    expect(job.status).toBe("failed");
    if (job.status !== "failed") return;
    expect(job.reason).toBe("cancelled");
    expect(sink.archive).toBeNull();
  });

  it("fails as corrupt-entry when the archive directory is unreadable", async () => {
    // Valid ZIP signature, garbage after it.
    const bogus = new Uint8Array(64);
    bogus.set([0x50, 0x4b, 0x03, 0x04], 0);
    const sink = new MemorySink();
    const job = await runIngest({ zip: bogus, sink });
    expect(job.status).toBe("failed");
    if (job.status !== "failed") return;
    expect(job.reason).toBe("corrupt-entry");
  });
});
