/**
 * Handing a locally built blob to the browser as a file (ADR 0020: a local write,
 * not network egress).
 *
 * The object URL is revoked immediately after the click. A URL that outlives its
 * download is the same bug class the media cache already fixed: an unbounded
 * reference to bytes nobody can free. The anchor is removed for the same reason.
 */

export interface ObjectUrls {
  readonly create: (blob: Blob) => string;
  readonly revoke: (url: string) => void;
}

const DEFAULT_URLS: ObjectUrls = {
  create: (blob) => URL.createObjectURL(blob),
  revoke: (url) => URL.revokeObjectURL(url),
};

/** `instavault-YYYY-MM-DD.zip`, local date: the day the person took the copy. */
export function zipFilename(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `instavault-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.zip`;
}

export function saveBlob(blob: Blob, filename: string, urls: ObjectUrls = DEFAULT_URLS): void {
  const url = urls.create(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    urls.revoke(url);
  }
}
