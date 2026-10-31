/**
 * Posts → the domain shape the gallery renders.
 *
 * The archive speaks `{ media: [{ uri, title, creation_timestamp }] }`; the UI
 * speaks `PostEntry`. Translation happens once, here (AGENTS.md §3, "different
 * layer, different abstraction").
 */

export interface PostEntry {
  /** The media path inside the archive; also the repository key. */
  readonly id: string;
  readonly caption: string;
  /** Unix seconds, as the export stores it. 0 when the export omits it. */
  readonly takenAt: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function toPostEntries(data: unknown): readonly PostEntry[] {
  if (!Array.isArray(data)) return [];

  const entries: PostEntry[] = [];
  for (const group of data) {
    if (!isObject(group) || !Array.isArray(group.media)) continue;
    for (const media of group.media) {
      if (!isObject(media) || typeof media.uri !== "string") continue;
      entries.push({
        id: media.uri,
        caption: typeof media.title === "string" ? media.title : "",
        takenAt: typeof media.creation_timestamp === "number" ? media.creation_timestamp : 0,
      });
    }
  }
  return entries;
}
