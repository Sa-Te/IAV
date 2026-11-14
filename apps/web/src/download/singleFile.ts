import { isSafeArchivePath } from "@instavault/core";

import { saveBlob, type ObjectUrls } from "./saveBlob.js";

/**
 * One original, saved as itself.
 *
 * A selection of exactly one, or the detail view's Download, is a file download —
 * not a one-entry ZIP. The bytes are the original blob, the filename is the
 * archive path's last segment, and the same path rule applies as for a ZIP entry:
 * an absolute path, a `..` segment, a backslash or a control character is refused.
 *
 * There is no "higher quality" variant to choose: the export contains one
 * resolution, and this is it.
 */

export interface OriginalSource {
  getMediaBlob(id: string): Promise<Blob | null>;
}

export type OriginalResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: string };

/** The last path segment, or null when there is none to save as. */
export function fileNameOf(path: string): string | null {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return name === "" ? null : name;
}

export async function downloadOriginal(
  id: string,
  source: OriginalSource,
  urls?: ObjectUrls,
): Promise<OriginalResult> {
  if (!isSafeArchivePath(id)) {
    return { ok: false, reason: `“${id}” is not a safe filename, so it was not downloaded.` };
  }
  const name = fileNameOf(id);
  if (name === null) {
    return { ok: false, reason: `“${id}” has no filename, so it was not downloaded.` };
  }
  const blob = await source.getMediaBlob(id);
  if (blob === null) {
    return { ok: false, reason: `“${id}” is no longer stored, so nothing was downloaded.` };
  }
  saveBlob(blob, name, urls);
  return { ok: true };
}
