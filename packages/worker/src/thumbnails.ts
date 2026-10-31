import { THUMBNAIL_QUALITY, type Dimensions, type ThumbnailEncoder } from "@instavault/core";

/**
 * The browser half of thumbnail generation: decode, draw, encode.
 *
 * Off-main-thread by construction — this module only ever runs inside the worker,
 * so a 12MP decode never blocks a scroll.
 */
export const browserThumbnailEncoder: ThumbnailEncoder<Blob> = {
  async measure(source: Blob): Promise<Dimensions | null> {
    if (!source.type.startsWith("image/")) return null;
    try {
      const bitmap = await createImageBitmap(source);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return size;
    } catch {
      return null;
    }
  },

  async encode(source: Blob, target: Dimensions) {
    try {
      const bitmap = await createImageBitmap(source);
      const canvas = new OffscreenCanvas(target.width, target.height);
      const context = canvas.getContext("2d");
      if (context === null) {
        bitmap.close();
        return null;
      }
      context.drawImage(bitmap, 0, 0, target.width, target.height);
      bitmap.close();

      const blob = await canvas.convertToBlob({ type: "image/webp", quality: THUMBNAIL_QUALITY });
      // Safari has returned png for a webp request; store what we actually got.
      return { blob, type: blob.type === "" ? "image/webp" : blob.type };
    } catch {
      return null;
    }
  },
};
