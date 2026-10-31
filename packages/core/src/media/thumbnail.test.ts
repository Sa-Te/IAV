import { describe, expect, it } from "vitest";

import { makeThumbnail, thumbnailDimensions, THUMBNAIL_MAX_EDGE } from "./thumbnail.js";
import type { MediaBytes } from "./state.js";

describe("thumbnailDimensions", () => {
  it("scales a 2000×1500 photo to a 512-wide thumbnail, preserving the ratio", () => {
    const target = thumbnailDimensions(2000, 1500);

    expect(target.width).toBe(512);
    expect(target.height).toBe(384);
    // Aspect ratio preserved to within one pixel.
    expect(Math.abs(target.width / target.height - 2000 / 1500)).toBeLessThan(0.01);
  });

  it("uses the long edge, so a portrait photo is bounded by height", () => {
    expect(thumbnailDimensions(1500, 2000)).toEqual({ width: 384, height: 512 });
  });

  it("never upscales a small image", () => {
    expect(thumbnailDimensions(100, 80)).toEqual({ width: 100, height: 80 });
  });

  it("keeps a one-pixel edge instead of rounding to zero", () => {
    expect(thumbnailDimensions(4000, 1).height).toBe(1);
  });
});

describe("makeThumbnail", () => {
  function synthetic(source: { width: number; height: number }, type = "image/webp") {
    const calls: { width: number; height: number }[] = [];
    const encoder = {
      async measure(): Promise<{ width: number; height: number }> {
        return source;
      },
      async encode(_blob: MediaBytes, target: { width: number; height: number }) {
        calls.push(target);
        return { blob: { type, size: 1234 } as MediaBytes, type };
      },
    };
    return { encoder, calls };
  }

  it("asks the encoder for at most 512 on the long edge", async () => {
    const { encoder, calls } = synthetic({ width: 2000, height: 1500 });
    const thumb = await makeThumbnail({ type: "image/jpeg", size: 900_000 }, encoder);

    expect(calls).toEqual([{ width: 512, height: 384 }]);
    expect(thumb?.width).toBeLessThanOrEqual(THUMBNAIL_MAX_EDGE);
    expect(thumb?.height).toBeLessThanOrEqual(THUMBNAIL_MAX_EDGE);
  });

  it("stores the type the encoder returned, not the type it asked for", async () => {
    const { encoder } = synthetic({ width: 100, height: 100 }, "image/png");
    const thumb = await makeThumbnail({ type: "image/jpeg", size: 10 }, encoder);

    expect(thumb?.type).toBe("image/png");
  });

  it("returns null when the source cannot be measured or encoded", async () => {
    const unmeasurable = {
      measure: async () => null,
      encode: async () => null,
    };
    expect(await makeThumbnail({ type: "image/jpeg", size: 1 }, unmeasurable)).toBeNull();

    const unencodable = {
      measure: async () => ({ width: 10, height: 10 }),
      encode: async () => null,
    };
    expect(await makeThumbnail({ type: "image/jpeg", size: 1 }, unencodable)).toBeNull();
  });
});
