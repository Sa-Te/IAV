import { z } from "zod";

/**
 * The schema for a category registered as "parse and store verbatim, no view in
 * v1" (M7b). Twelve files appeared in `archive-2/` that no rule had ever seen.
 * They are real data, so they must not sit in the unrecognised bucket for ever —
 * but nothing has been measured about what the *values* mean, and inventing labels
 * for someone's payment or AI-conversation records is worse than keeping them
 * intact.
 *
 * So the schema asserts the only thing that was measured: the container kind. The
 * measured key-set lives on the registry row, where it drives resolution (ADR
 * 0008); the values are opaque here on purpose, so an added key can never turn a
 * file into a parse failure.
 */
export const opaqueArraySchema = z.array(z.unknown());
export const opaqueObjectSchema = z.record(z.string(), z.unknown());

export type OpaqueKind = "array" | "object";
