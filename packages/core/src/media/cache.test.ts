import { describe, expect, it, vi } from "vitest";

import { createMediaCache, MEDIA_CACHE_CAP } from "./cache.js";
import type { DecodedBitmap, DecodedMedia, MediaBytes } from "./state.js";

/**
 * The cache's whole job is to be predictable about three things: one decode per
 * path, a bound, and release. All three are asserted with recorders so the order
 * of `revokeUrl` and `close` is a fact, not a comment.
 */

function fakeRuntime(options: { decodeFails?: boolean } = {}): {
  runtime: {
    createUrl(blob: MediaBytes): string;
    revokeUrl(url: string): void;
    decode(blob: MediaBytes): Promise<DecodedMedia>;
  };
  calls: string[];
  bitmaps: DecodedBitmap[];
} {
  const calls: string[] = [];
  const bitmaps: DecodedBitmap[] = [];
  let next = 0;

  return {
    calls,
    bitmaps,
    runtime: {
      createUrl() {
        next += 1;
        return `blob:test/${next}`;
      },
      revokeUrl(url) {
        calls.push(`revoke:${url}`);
      },
      async decode(): Promise<DecodedMedia> {
        if (options.decodeFails === true) return { ok: false, reason: "decode" };
        let closed = false;
        const bitmap: DecodedBitmap = {
          width: 10,
          height: 10,
          close() {
            closed = true;
            calls.push("close:bitmap");
          },
        };
        bitmaps.push(bitmap);
        void closed;
        return { ok: true, bitmap };
      },
    },
  };
}

function blob(type = "image/jpeg", size = 10): MediaBytes {
  return { type, size };
}

describe("media cache", () => {
  it("decodes a path once even when two callers ask at the same time", async () => {
    const load = vi.fn(async () => blob());
    const { runtime } = fakeRuntime();
    const cache = createMediaCache(load, runtime);

    const [a, b] = await Promise.all([cache.getUrl("a.jpg"), cache.getUrl("a.jpg")]);

    expect(load).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(a.status).toBe("ready");
  });

  it("serves a second request from the cache without loading again", async () => {
    const load = vi.fn(async () => blob());
    const cache = createMediaCache(load, fakeRuntime().runtime);

    await cache.getUrl("a.jpg");
    await cache.getUrl("a.jpg");

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("evicts the least recently used entry at cap+1, revoking then closing", async () => {
    const { runtime, calls } = fakeRuntime();
    const cache = createMediaCache(async () => blob(), runtime, 2);

    await cache.getUrl("first.jpg");
    await cache.getUrl("second.jpg");
    // Touch the first so the second is now the oldest.
    await cache.getUrl("first.jpg");
    await cache.getUrl("third.jpg");

    expect(cache.size()).toBe(2);
    // Two URLs existed; exactly the evicted one was revoked, then its bitmap closed.
    expect(calls).toEqual(["revoke:blob:test/2", "close:bitmap"]);
  });

  it("caps at the documented 150 entries by default", async () => {
    const cache = createMediaCache(async () => blob(), fakeRuntime().runtime);
    for (let index = 0; index < MEDIA_CACHE_CAP + 5; index += 1) {
      await cache.getUrl(`p/${index}.jpg`);
    }

    expect(cache.size()).toBe(MEDIA_CACHE_CAP);
  });

  it("releaseAll revokes every URL and closes every bitmap", async () => {
    const { runtime, calls } = fakeRuntime();
    const cache = createMediaCache(async () => blob(), runtime);

    await cache.getUrl("a.jpg");
    await cache.getUrl("b.jpg");
    cache.releaseAll();

    expect(cache.size()).toBe(0);
    expect(calls.filter((call) => call.startsWith("revoke:"))).toHaveLength(2);
    expect(calls.filter((call) => call === "close:bitmap")).toHaveLength(2);
  });

  it("reports a decode failure as failed/decode, never pending", async () => {
    const { runtime } = fakeRuntime({ decodeFails: true });
    const cache = createMediaCache(async () => blob(), runtime);

    expect(await cache.getUrl("broken.jpg")).toEqual({ status: "failed", reason: "decode" });
  });

  it("distinguishes a missing blob from an undecodable one", async () => {
    const cache = createMediaCache(async () => null, fakeRuntime().runtime);

    expect(await cache.getUrl("gone.jpg")).toEqual({ status: "failed", reason: "missing" });
  });

  it("returns the decoded bitmap for WebGL use, and null for video", async () => {
    const { runtime } = fakeRuntime();
    const cache = createMediaCache(async () => blob(), runtime);
    const withBitmap = await cache.getBitmap("a.jpg");
    expect(withBitmap?.width).toBe(10);

    const videoRuntime = {
      createUrl: () => "blob:v",
      revokeUrl: () => undefined,
      decode: async (): Promise<DecodedMedia> => ({ ok: true, bitmap: null }),
    };
    const videoCache = createMediaCache(async () => blob("video/mp4"), videoRuntime);
    expect(await videoCache.getBitmap("v.mp4")).toBeNull();
    expect((await videoCache.getUrl("v.mp4")).status).toBe("ready");
  });
});
