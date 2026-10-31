import { z } from "zod";

/**
 * Measured (M6 probe): archived posts have exactly the same key set as posts at
 * both levels. The only observed difference is caption length. Kept as its own
 * schema so the two can diverge without one silently inheriting the other's rules.
 */
export const archivedPostSchema = z
  .object({
    media: z.array(
      z
        .object({
          uri: z.string().min(1),
          creation_timestamp: z.number(),
          title: z.string().optional(),
          cross_post_source: z.object({ source_app: z.string() }).loose().optional(),
        })
        .loose(),
    ),
  })
  .loose();

export const archivedPostsSchema = z
  .object({ ig_archived_post_media: z.array(archivedPostSchema) })
  .loose();

export type RawArchivedGroup = z.infer<typeof archivedPostSchema>;
