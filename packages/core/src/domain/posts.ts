import { parsePosts } from "../parsers/posts.js";

/**
 * Posts → the domain shape the gallery renders.
 *
 * The archive speaks two shapes (legacy `{ media: [...] }` groups and label/value
 * envelopes); the UI speaks `PostEntry`. Translation happens once, in
 * `parsers/posts.ts` (AGENTS.md §3, "different layer, different abstraction").
 *
 * The gallery contract is a list, never a failure: an unreadable record renders as
 * no items here and stays reachable through the raw JSON.
 */

export interface PostEntry {
  /** The media path inside the archive; also the repository key. */
  readonly id: string;
  readonly caption: string;
  /** Unix seconds, as the export stores it. 0 when the export omits it. */
  readonly takenAt: number;
}

export function toPostEntries(data: unknown): readonly PostEntry[] {
  const parsed = parsePosts(data);
  return parsed.ok ? parsed.data : [];
}
