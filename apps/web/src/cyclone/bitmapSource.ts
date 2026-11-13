import type { MediaItemView } from "@instavault/core";

import type { CycloneInput } from "./startCyclone.js";

/** Everything the cyclone needs from the repository: one blob per item id. */
export interface BlobSource {
  getMediaBlob(id: string): Promise<Blob | null>;
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
      const blob = await repository.getMediaBlob(item.id);
      if (blob === null) return null;
      try {
        return await createImageBitmap(blob, {
          resizeWidth: 256,
          resizeHeight: 256,
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
