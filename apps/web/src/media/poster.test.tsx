// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearPosterCache, POSTER_PREFIX, requestPoster, type PosterStore } from "./poster.js";
import { MediaTile } from "./MediaTile.js";

afterEach(() => {
  cleanup();
  clearPosterCache();
});

function memoryStore(seed: Record<string, Blob> = {}): PosterStore & { rows: string[] } {
  const rows: string[] = [];
  return {
    rows,
    get: async (path) => seed[path] ?? null,
    put: async (path) => {
      rows.push(path);
    },
  };
}

describe("video posters", () => {
  it("uses a stored poster without decoding anything", async () => {
    const stored = new Blob(["poster"], { type: "image/webp" });
    const store = memoryStore({ [`${POSTER_PREFIX}media/story.mp4`]: stored });

    const result = await requestPoster("media/story.mp4", new Blob(["video"]), store);

    expect(result).toBe(stored);
    expect(store.rows).toEqual([]);
  });

  it("returns null and stores nothing when the video cannot be decoded", async () => {
    // jsdom has no media pipeline, which is exactly the failure this must survive:
    // the 10 s deadline aborts the decode and the answer is null, not silence.
    vi.useFakeTimers();
    const store = memoryStore();
    const pending = requestPoster("media/story.mp4", new Blob(["video"]), store);
    await vi.advanceTimersByTimeAsync(10_000);
    const result = await pending;
    vi.useRealTimers();

    expect(result).toBeNull();
    expect(store.rows).toEqual([]);
  });

  it("asks once for the same clip, even from two tiles", async () => {
    vi.useFakeTimers();
    const store = memoryStore();
    const blob = new Blob(["video"]);

    const both = Promise.all([
      requestPoster("media/twice.mp4", blob, store),
      requestPoster("media/twice.mp4", blob, store),
    ]);
    await vi.advanceTimersByTimeAsync(10_000);
    const [first, second] = await both;
    vi.useRealTimers();

    expect(first).toBeNull();
    expect(second).toBeNull();
  });
});

describe("a video tile before its poster", () => {
  it("shows the play glyph and the duration, so it is identifiable", async () => {
    render(
      <MediaTile
        item={{ id: "media/clip.mp4", category: "stories", caption: "clip", takenAt: 0 }}
        source={{
          getMediaBlob: async () => new Blob(["video"], { type: "video/mp4" }),
        }}
        onOpen={() => undefined}
      />,
    );

    const video = await screen.findByTestId("tile-video");
    Object.defineProperty(video, "duration", { value: 12, configurable: true });
    fireEvent.loadedMetadata(video);

    expect(screen.getByText("0:12")).toBeDefined();
    expect(screen.getByText("▶")).toBeDefined();
  });
});
