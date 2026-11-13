/**
 * One count vocabulary for the sidebar, the tier pages and the overview.
 *
 * Two rules live here, not in three components:
 *  - a count is always labelled with its unit, so "1" never means "one of
 *    something, we forget what";
 *  - a count of one is singular. "1 entries" was the bug this module exists to
 *    make impossible to reintroduce.
 */

export interface CategoryCounts {
  readonly entries: number;
  readonly media: number;
}

export function pluralCount(value: number, singular: string, plural = `${singular}s`): string {
  return `${value.toLocaleString("en-US")} ${value === 1 ? singular : plural}`;
}

/**
 * The sidebar's rule: media when the category holds any, otherwise entries.
 * Neither means nothing at all — a bare 0 is not information.
 */
export function primaryCount(counts: CategoryCounts): string | null {
  if (counts.media > 0) return pluralCount(counts.media, "media item");
  if (counts.entries > 0) return pluralCount(counts.entries, "entry", "entries");
  return null;
}

/** Both units, each labelled, for pages with room to be explicit. */
export function describeCounts(counts: CategoryCounts): string | null {
  const parts: string[] = [];
  if (counts.entries > 0) parts.push(pluralCount(counts.entries, "entry", "entries"));
  if (counts.media > 0) parts.push(pluralCount(counts.media, "media item"));
  return parts.length === 0 ? null : parts.join(" · ");
}
