// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import {
  createTextureWindow,
  TextureBudgetError,
  THUMBNAIL_SIZE,
  type LayerSink,
} from "./textures.js";

/** jsdom has no WebGL, so the seam is tested: what is uploaded, freed and closed. */
function sink(layers = 96): LayerSink & { uploads: number[]; cleared: number[] } {
  const uploads: number[] = [];
  const cleared: number[] = [];
  return {
    layerCount: layers,
    uploads,
    cleared,
    upload(layer) {
      uploads.push(layer);
    },
    clear(layer) {
      cleared.push(layer);
    },
  };
}

function bitmap(width = THUMBNAIL_SIZE, height = THUMBNAIL_SIZE) {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}

describe("texture window", () => {
  it("requests each entering index exactly once, at 256px", async () => {
    const source = { request: vi.fn(async () => bitmap()) };
    const target = sink();
    const window = createTextureWindow(target, source);

    await window.setWindow([1, 2, 3]);

    expect(source.request.mock.calls).toEqual([
      [1, 256],
      [2, 256],
      [3, 256],
    ]);
    expect(window.stats().resident).toBe(3);
  });

  it("does not re-upload an index that is already resident", async () => {
    const source = { request: vi.fn(async () => bitmap()) };
    const window = createTextureWindow(sink(), source);

    await window.setWindow([1, 2]);
    await window.setWindow([1, 2, 3]);

    expect(source.request).toHaveBeenCalledTimes(3);
  });

  it("frees the layer and closes the bitmap of a card that leaves", async () => {
    const created: ImageBitmap[] = [];
    const source = {
      request: vi.fn(async () => {
        const next = bitmap();
        created.push(next);
        return next;
      }),
    };
    const target = sink();
    const window = createTextureWindow(target, source);

    await window.setWindow([1, 2]);
    await window.setWindow([2]);

    expect(target.cleared).toHaveLength(1);
    // Every bitmap is closed after upload; none is retained.
    for (const each of created) expect(each.close as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    expect(window.stats().resident).toBe(1);
  });

  it("closes a bitmap that arrives after its card left the window", async () => {
    let release: ((value: ImageBitmap) => void) | undefined;
    const late = bitmap();
    const source = {
      request: vi.fn(
        () =>
          new Promise<ImageBitmap>((resolve) => {
            release = resolve;
          }),
      ),
    };
    const window = createTextureWindow(sink(), source);

    const first = window.setWindow([7]);
    await window.setWindow([]);
    release?.(late);
    await first;

    expect(late.close as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    expect(window.stats().resident).toBe(0);
  });

  it("accounts bytes from the resident bitmaps, not the requested size", async () => {
    const window = createTextureWindow(sink(), {
      request: vi.fn(async () => bitmap(128, 128)),
    });

    await window.setWindow([1, 2]);

    expect(window.stats()).toEqual({ resident: 2, bytes: 2 * 128 * 128 * 4, pending: 0 });
  });

  it("refuses a sink with fewer layers than the budget", () => {
    expect(() => createTextureWindow(sink(64), { request: async () => null })).toThrow(
      /needs 96 layers/,
    );
  });

  it("never grows past the budget: asking for more than 96 throws", async () => {
    const window = createTextureWindow(sink(96), { request: async () => bitmap() });

    await expect(
      window.setWindow(Array.from({ length: 96 }, (_, index) => index)),
    ).resolves.toBeUndefined();
    await expect(window.setWindow(Array.from({ length: 97 }, (_, index) => index))).rejects.toThrow(
      /budget/,
    );
  });

  it("releases everything on close", async () => {
    const target = sink();
    const window = createTextureWindow(target, { request: async () => bitmap() });

    await window.setWindow([1, 2, 3]);
    window.close();

    expect(window.stats().resident).toBe(0);
    expect(target.cleared).toHaveLength(3);
  });
});

describe("budget refusal is typed (M14)", () => {
  it("throws TextureBudgetError carrying the requested count and the cap", async () => {
    const window = createTextureWindow(sink(96), { request: async () => bitmap() });

    await expect(
      window.setWindow(Array.from({ length: 97 }, (_, index) => index)),
    ).rejects.toMatchObject({ name: "TextureBudgetError", cap: 96 });

    await expect(
      window.setWindow(Array.from({ length: 97 }, (_, index) => index)),
    ).rejects.toBeInstanceOf(TextureBudgetError);
  });
});
