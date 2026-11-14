/**
 * The two honest limits of a browser-built ZIP, stated before the download rather
 * than after it fails.
 */

/**
 * Above this, the archive is big enough that assembling it in memory can fail on a
 * memory-constrained device. The reader is told and may narrow the selection or
 * proceed; nothing is blocked.
 */
export const ZIP_MEMORY_WARNING_BYTES = 300 * 1024 * 1024;

/** iPadOS 13+ reports a Macintosh user agent; this catches the shapes it can see. */
export function isIos(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent);
}
