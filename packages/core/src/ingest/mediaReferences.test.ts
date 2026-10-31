import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { MemorySink } from "../../test/fakes/memorySink.js";
import { detectMime } from "./mime.js";
import { runIngest } from "./ingest.js";

/**
 * Media is stored because a resolved reference points at it, not because the
 * filename has a known extension. Each case below is one way that distinction
 * matters.
 */

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const JPEG_B = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x47, 0x01]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MP4 = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
]);

function thread(extra: Record<string, unknown>): string {
  return JSON.stringify({
    participants: [{ name: "fixture" }],
    messages: [{ sender_name: "fixture", timestamp_ms: 1, content: "hi", ...extra }],
    title: "fixture",
    thread_path: "inbox/fixture",
    is_still_participant: true,
    magic_words: [],
  });
}

describe("detectMime", () => {
  it("prefers magic bytes over the extension", () => {
    expect(detectMime(JPEG, "mystery")).toBe("image/jpeg");
    expect(detectMime(PNG, "photo.jpg")).toBe("image/png");
    expect(detectMime(MP4, "clip.bin")).toBe("video/mp4");
  });

  it("falls back to the extension, then to octet-stream", () => {
    expect(detectMime(new Uint8Array([0, 0, 0]), "sound.m4a")).toBe("audio/mp4");
    expect(detectMime(new Uint8Array([0, 0, 0]), "file.xyz")).toBe("application/octet-stream");
  });
});

describe("media references", () => {
  it("resolves thread-relative media and keeps same-named files apart", async () => {
    const zip = zipSync({
      "messages/inbox/thread_a/message_1.json": strToU8(
        thread({
          photos: [{ uri: "photos/same.jpg", creation_timestamp: 1 }],
          videos: [{ uri: "videos/same.mp4" }],
          audio_files: [{ uri: "audio/same.m4a" }],
        }),
      ),
      "messages/inbox/thread_a/photos/same.jpg": JPEG,
      "messages/inbox/thread_a/videos/same.mp4": MP4,
      "messages/inbox/thread_a/audio/same.m4a": new Uint8Array([0, 0, 0, 1]),
      "messages/inbox/thread_b/message_1.json": strToU8(
        thread({ photos: [{ uri: "photos/same.jpg" }] }),
      ),
      "messages/inbox/thread_b/photos/same.jpg": JPEG_B,
    });

    const sink = new MemorySink();
    const job = await runIngest({ zip, sink });
    if (job.status !== "ready") throw new Error("expected ready");

    expect(job.summary.mediaStored).toBe(4);
    expect(job.summary.mediaMissing).toBe(0);
    const a = sink.media.get("messages/inbox/thread_a/photos/same.jpg");
    const b = sink.media.get("messages/inbox/thread_b/photos/same.jpg");
    expect(a?.bytes.length).toBe(JPEG.length);
    expect(b?.bytes.length).toBe(JPEG_B.length);
  });

  it("stores a referenced file that has no extension, typed by magic bytes", async () => {
    const zip = zipSync({
      "posts_1.json": strToU8(JSON.stringify([{ media: [{ uri: "media/posts/one" }] }])),
      "media/posts/one": JPEG,
    });

    const sink = new MemorySink();
    const job = await runIngest({ zip, sink });
    if (job.status !== "ready") throw new Error("expected ready");

    expect(job.summary.mediaStored).toBe(1);
    expect(sink.media.get("media/posts/one")?.mime).toBe("image/jpeg");
  });

  it("counts a reference to a missing file without failing the run", async () => {
    const zip = zipSync({
      "posts_1.json": strToU8(JSON.stringify([{ media: [{ uri: "media/posts/gone.jpg" }] }])),
    });

    const sink = new MemorySink();
    const job = await runIngest({ zip, sink });
    if (job.status !== "ready") throw new Error("expected ready");

    expect(job.summary.mediaMissing).toBe(1);
    expect(job.summary.mediaStored).toBe(0);
  });

  it("counts an unreferenced media file as an orphan and does not store it", async () => {
    const zip = zipSync({
      "posts_1.json": strToU8(JSON.stringify([{ media: [{ uri: "media/posts/used.jpg" }] }])),
      "media/posts/used.jpg": JPEG,
      "media/posts/orphan.jpg": JPEG_B,
    });

    const sink = new MemorySink();
    const job = await runIngest({ zip, sink });
    if (job.status !== "ready") throw new Error("expected ready");

    expect(job.summary.mediaOrphans).toBe(1);
    expect([...sink.media.keys()]).toEqual(["media/posts/used.jpg"]);
  });

  it("stores a path referenced twice only once", async () => {
    const zip = zipSync({
      "posts_1.json": strToU8(JSON.stringify([{ media: [{ uri: "media/a.jpg" }] }])),
      "stories.json": strToU8(
        JSON.stringify({ ig_stories: [{ uri: "media/a.jpg", creation_timestamp: 1 }] }),
      ),
      "media/a.jpg": JPEG,
    });

    const sink = new MemorySink();
    const job = await runIngest({ zip, sink });
    if (job.status !== "ready") throw new Error("expected ready");

    expect(job.summary.mediaStored).toBe(1);
    expect(sink.media.size).toBe(1);
  });

  it("reports mediaStored as the number of unique resolved references", async () => {
    const zip = zipSync({
      "posts_1.json": strToU8(
        JSON.stringify([
          { media: [{ uri: "media/one.jpg" }] },
          { media: [{ uri: "media/two.png" }] },
          { media: [{ uri: "media/one.jpg" }] },
        ]),
      ),
      "media/one.jpg": JPEG,
      "media/two.png": PNG,
    });

    const sink = new MemorySink();
    const job = await runIngest({ zip, sink });
    if (job.status !== "ready") throw new Error("expected ready");

    expect(job.summary.mediaStored).toBe(2);
    expect(new Set(sink.media.keys()).size).toBe(2);
  });
});
