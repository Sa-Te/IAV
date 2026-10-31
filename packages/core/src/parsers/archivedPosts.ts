import { archivedPostsSchema, type RawArchivedGroup } from "../schema/archivedPosts.js";
import type { ParseResult } from "./result.js";

export interface ArchivedPostEntry {
  readonly id: string;
  readonly caption: string;
  readonly takenAt: number;
  /** Opaque two-character code; stored, never interpreted (manifest §11, Q3). */
  readonly sourceApp: string | null;
}

function toEntries(group: RawArchivedGroup): ArchivedPostEntry[] {
  return group.media.map((media) => ({
    id: media.uri,
    caption: media.title ?? "",
    takenAt: media.creation_timestamp,
    sourceApp: media.cross_post_source?.source_app ?? null,
  }));
}

export function parseArchivedPosts(input: unknown): ParseResult<readonly ArchivedPostEntry[]> {
  const parsed = archivedPostsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "archived_posts.json did not match the measured shape",
      raw: input,
    };
  }

  const entries = parsed.data.ig_archived_post_media.flatMap(toEntries);
  return { ok: true, data: entries, warnings: [] };
}
