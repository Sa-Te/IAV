import { storiesSchema, type RawStory } from "../schema/stories.js";
import type { ParseResult } from "./result.js";

export interface StoryEntry {
  readonly id: string;
  readonly caption: string;
  readonly takenAt: number;
  /** Verbatim: always `[]` in the measured export (manifest §11, Q4). */
  readonly mediaVariants: readonly unknown[];
  /** Verbatim: always `[]` in the measured export (manifest §11, Q5). */
  readonly dubbingInfo: readonly unknown[];
  /** Opaque two-character code; stored, never interpreted (manifest §11, Q3). */
  readonly sourceApp: string | null;
}

function toEntry(story: RawStory): StoryEntry {
  return {
    id: story.uri,
    caption: story.title ?? "",
    takenAt: story.creation_timestamp,
    mediaVariants: story.media_variants ?? [],
    dubbingInfo: story.dubbing_info ?? [],
    sourceApp: story.cross_post_source?.source_app ?? null,
  };
}

export function parseStories(input: unknown): ParseResult<readonly StoryEntry[]> {
  const parsed = storiesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "stories.json did not match the measured shape", raw: input };
  }

  const stories = parsed.data.ig_stories.map(toEntry);
  const warnings = stories
    .filter((story) => typeof story.id !== "string" || story.id.length === 0)
    .map(() => ({ code: "empty-uri", detail: "a story has no media path" }));

  return { ok: true, data: stories, warnings };
}
