/**
 * What a download will contain, decided before anything is read or written.
 *
 * The plan is pure: it takes the selected ids and the media store's size index,
 * and it answers four questions the UI has to answer honestly *before* the ZIP
 * starts — how many entries, how many bytes, what is being left out and why, and
 * how many duplicate references collapsed.
 *
 * Two rules are not negotiable here:
 *
 * - an archive path is untrusted input, and it becomes a filename inside a ZIP
 *   that a person will extract. Absolute paths, `..` segments, backslashes and
 *   control characters are refused, never rewritten and never silently dropped.
 * - a selected item with no stored blob cannot be written. It is counted, given
 *   a reason and shown to the reader, so the download never quietly contains
 *   fewer files than the count said.
 */

export interface MediaRecordSize {
  readonly id: string;
  /** Stored size in bytes. */
  readonly bytes: number;
  /** False for a category reference whose media the export never contained. */
  readonly hasBlob: boolean;
}

export type ZipSkipReason = "no-blob" | "unsafe-path";

export interface ZipSkip {
  readonly id: string;
  readonly reason: ZipSkipReason;
}

export interface ZipEntry {
  /** The archive-relative path, preserved verbatim (D2). */
  readonly archivePath: string;
  readonly bytes: number;
}

export interface ZipPlan {
  readonly entries: readonly ZipEntry[];
  readonly skipped: readonly ZipSkip[];
  /** Selected ids that named a path already in `entries`, e.g. the profile photo. */
  readonly duplicates: number;
  readonly totalBytes: number;
}

/** A drive letter and colon is absolute on Windows even with forward slashes. */
const WINDOWS_ABSOLUTE = /^[A-Za-z]:/;

/** C0 controls and DEL. A regex would need `no-control-regex` disabled to say this. */
function hasControlCharacter(path: string): boolean {
  for (let index = 0; index < path.length; index += 1) {
    const code = path.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * The one path rule. Applied to every entry unconditionally, whatever the source
 * category claimed about its own paths.
 */
export function isSafeArchivePath(path: string): boolean {
  if (path === "") return false;
  if (path.startsWith("/")) return false;
  if (WINDOWS_ABSOLUTE.test(path)) return false;
  if (path.includes("\\")) return false;
  if (hasControlCharacter(path)) return false;
  return !path.split("/").includes("..");
}

export function buildZipPlan(
  selectedIds: readonly string[],
  records: readonly MediaRecordSize[],
): ZipPlan {
  const byId = new Map(records.map((record) => [record.id, record]));
  const seen = new Set<string>();
  const entries: ZipEntry[] = [];
  const skipped: ZipSkip[] = [];
  let duplicates = 0;
  let totalBytes = 0;

  for (const id of selectedIds) {
    const record = byId.get(id);
    if (record === undefined || !record.hasBlob) {
      skipped.push({ id, reason: "no-blob" });
      continue;
    }
    if (!isSafeArchivePath(id)) {
      skipped.push({ id, reason: "unsafe-path" });
      continue;
    }
    // One path, one entry: the profile photo is referenced twice by the archive.
    if (seen.has(id)) {
      duplicates += 1;
      continue;
    }
    seen.add(id);
    entries.push({ archivePath: id, bytes: record.bytes });
    totalBytes += record.bytes;
  }

  return { entries, skipped, duplicates, totalBytes };
}
