import type { DecodedMedia, MediaCacheRuntime } from "@instavault/core";

/**
 * The browser half of the cache. Core owns the policy; this owns the two globals
 * that make it real — `URL` and `createImageBitmap` — so core stays runnable under
 * Node and the runtime can be faked in a test.
 */
export const browserRuntime: MediaCacheRuntime<Blob> = {
  createUrl(blob) {
    return URL.createObjectURL(blob);
  },

  revokeUrl(url) {
    URL.revokeObjectURL(url);
  },

  async decode(blob): Promise<DecodedMedia> {
    // Video and audio have no pixels to decode here. A poster frame would need a
    // DOM <video> + canvas, which is M10 (D4), not a silent "decode failed".
    if (!blob.type.startsWith("image/")) return { ok: true, bitmap: null };
    if (typeof createImageBitmap !== "function") return { ok: true, bitmap: null };
    try {
      return { ok: true, bitmap: await createImageBitmap(blob) };
    } catch {
      return { ok: false, reason: "decode" };
    }
  },
};
