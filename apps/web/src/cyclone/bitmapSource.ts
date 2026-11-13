import type { MediaItemView } from "@instavault/core";

import { requestPoster, type PosterStore } from "../media/poster.js";
import type { CycloneInput } from "./startCyclone.js";

/** Everything the cyclone needs from the repository: one blob per item id. */
export interface BlobSource {
  getMediaBlob(id: string): Promise<Blob | null>;
  /** The stored poster for a video, keyed `poster:<path>`; absent until one is made. */
  getThumbnail?(path: string): Promise<{ blob: Blob } | null>;
}

/**
 * The poster a video already has, if the grid made one. Videos have no bitmap of
 * their own, and skipping them left half the ribbon empty.
 */
async function posterFor(repository: BlobSource, id: string, video: Blob): Promise<Blob | null> {
  try {
    const stored = (await repository.getThumbnail?.(`poster:${id}`))?.blob ?? null;
    if (stored !== null) return stored;
    const store: PosterStore | null =
      repository.getThumbnail === undefined
        ? null
        : {
            get: async (path) => (await repository.getThumbnail?.(path))?.blob ?? null,
            put: async () => undefined,
          };
    if (store === null) return null;
    // Generated here too, not only by the grid: opening /cyclone directly must not
    // show a ribbon of holes.
    return await requestPoster(id, video, store);
  } catch {
    return null;
  }
}

/**
 * The one place that turns stored media into cyclone bitmaps, shared by the route
 * and by the dev stats overlay — they each had a copy, so a test could break one
 * and watch the other stay green (M17).
 *
 * 256px, not the grid's 512px (ADR 0010): the cards are small and the window is
 * what bounds memory. There is no stored 256px variant to fall back to —
 * thumbnails are one size — so the fallback is the original at its own size: a
 * missing optimisation may never produce an empty scene (AGENTS.md §7).
 */
export function cycloneBitmapSource(
  repository: BlobSource,
  items: readonly MediaItemView[],
): readonly CycloneInput[] {
  return items.map((item, index) => ({
    index,
    bitmap: async () => {
      const stored = await repository.getMediaBlob(item.id);
      const blob =
        stored !== null && stored.type.startsWith("video/")
          ? await posterFor(repository, item.id, stored)
          : stored;
      if (blob === null) return null;
      try {
        // Fit inside 256x256, keeping the picture's own ratio. Asking for 256x256
        // squashed the photo; asking for width alone produced a layer taller than
        // the 256-layer slot (a GL error, so every card came out black).
        const natural = await createImageBitmap(blob);
        const scale = Math.min(1, 256 / Math.max(natural.width, natural.height));
        const width = Math.max(1, Math.round(natural.width * scale));
        const height = Math.max(1, Math.round(natural.height * scale));
        natural.close();
        if (scale === 1) return await createImageBitmap(blob);
        return await createImageBitmap(blob, {
          resizeWidth: width,
          resizeHeight: height,
          resizeQuality: "medium",
        });
      } catch {
        try {
          return await createImageBitmap(blob);
        } catch {
          // A video, or an image this device cannot decode: the window records it
          // once and draws the rest.
          return null;
        }
      }
    },
  }));
}
