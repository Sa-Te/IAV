import { beforeEach, describe, expect, it } from "vitest";

import {
  clearMediaRequestCache,
  loadMedia,
  requestCount,
  type MediaSource,
} from "./useMediaUrl.js";

/**
 * The hook's decision logic, tested without a DOM: what the three states are and
 * that a missing blob is a failure rather than an eternal "pending".
 */

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });

function source(blobs: Record<string, Blob | null>): MediaSource & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async getMediaBlob(id: string) {
      calls.push(id);
      return blobs[id] ?? null;
    },
  };
}

beforeEach(() => {
  clearMediaRequestCache();
});

describe("loadMedia", () => {
  it("resolves to a blob when it exists", async () => {
    const repository = source({ "media/a.jpg": JPEG });
    const result = await loadMedia("media/a.jpg", repository);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.blob.type).toBe("image/jpeg");
  });

  it("reports missing, never pending, when the blob does not exist", async () => {
    const repository = source({});
    expect(await loadMedia("media/gone.jpg", repository)).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("reports decode when the decoder rejects the bytes", async () => {
    const repository = source({ "media/broken.jpg": JPEG });
    expect(await loadMedia("media/broken.jpg", repository, async () => false)).toEqual({
      ok: false,
      reason: "decode",
    });
  });

  it("treats a repository failure as missing, not as a crash", async () => {
    const repository: MediaSource = {
      getMediaBlob: () => Promise.reject(new Error("storage gone")),
    };
    expect(await loadMedia("media/a.jpg", repository)).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("shares one request between two callers for the same id", async () => {
    const repository = source({ "media/a.jpg": JPEG });
    const [first, second] = await Promise.all([
      loadMedia("media/a.jpg", repository),
      loadMedia("media/a.jpg", repository),
    ]);

    expect(first.ok && second.ok).toBe(true);
    expect(repository.calls.filter((id) => id === "media/a.jpg")).toHaveLength(1);
    expect(requestCount()).toBe(1);
  });

  it("keeps separate requests for different ids", async () => {
    const repository = source({ "media/a.jpg": JPEG, "media/b.jpg": JPEG });
    await loadMedia("media/a.jpg", repository);
    await loadMedia("media/b.jpg", repository);
    expect(requestCount()).toBe(2);
  });
});
