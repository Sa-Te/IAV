import { z } from "zod";

/**
 * Measured against docs/archive-manifest.md §2.2 and the M6 probe.
 * `media_variants` and `dubbing_info` are kept verbatim: in this export they are
 * always empty arrays, so their meaning is unknown (manifest §11, Q4/Q5).
 */
export const storySchema = z
  .object({
    uri: z.string().min(1),
    creation_timestamp: z.number(),
    title: z.string().optional(),
    cross_post_source: z.object({ source_app: z.string() }).loose().optional(),
    media_variants: z.array(z.unknown()).optional(),
    dubbing_info: z.array(z.unknown()).optional(),
    media_metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

export const storiesSchema = z.object({ ig_stories: z.array(storySchema) }).loose();

export type RawStory = z.infer<typeof storySchema>;
