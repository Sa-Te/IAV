import { z } from "zod";

/**
 * `posts` has been measured in two shapes, and one export can contain both
 * (docs/T3-DESIGN.md §2, M22):
 *
 * - **legacy group** — `{ media: [record] }`, the same shape as `archived_posts`;
 * - **label/value envelope** — `{ timestamp, label_values: [...] }` where the media
 *   array sits inside the label `Media` and the caption inside `Caption`.
 *
 * The envelope is the newer format: in `archive-2/` its 78 entries contain all 51
 * legacy media records plus 27 that the legacy file never had. Both are declared
 * here because a future export may contain either one alone.
 */

export const postMediaSchema = z
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

/** A label item. `media` only appears on the `Media` label; `label` is absent on containers. */
export const postLabelSchema = z
  .object({
    label: z.string().optional(),
    title: z.string().optional(),
    value: z.unknown().optional(),
    media: z.array(postMediaSchema).optional(),
  })
  .loose();

export const postGroupSchema = z.object({ media: z.array(postMediaSchema) }).loose();

export const postEnvelopeSchema = z
  .object({
    timestamp: z.number(),
    label_values: z.array(postLabelSchema),
  })
  .loose();

export type RawPostMedia = z.infer<typeof postMediaSchema>;
export type RawPostLabel = z.infer<typeof postLabelSchema>;
export type RawPostGroup = z.infer<typeof postGroupSchema>;
export type RawPostEnvelope = z.infer<typeof postEnvelopeSchema>;
