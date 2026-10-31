/**
 * A structural signature for tier-2 resolution (ADR 0002).
 *
 * `requiredKeys` are top-level keys of the object, or of `element[0]` when
 * `kind` is "array". `absentKeys` exists because two categories can be
 * structurally identical except for a flag one of them never carries: a message
 * request has `is_pending`, an inbox thread does not. Without it, tier 2 could
 * not tell the two apart (ADR 0002, "message threads").
 */
export interface Signature {
  readonly kind: "array" | "object";
  readonly requiredKeys: readonly string[];
  readonly absentKeys?: readonly string[];
}

export interface CategoryMatch {
  /** Anchored to the basename only, case-insensitive, numeric suffix optional. */
  readonly basenames: readonly RegExp[];
  /** Used only where the parent folder is the discriminator (message threads). */
  readonly parentSegment?: RegExp;
}

export interface Category {
  readonly id: string;
  readonly label: string;
  readonly privacyTier: 1 | 2 | 3 | 4 | 5;
  readonly variantRisk: "low" | "medium" | "high";
  readonly match: CategoryMatch;
  readonly signature: Signature | null;
  readonly mediaPath: "root-relative" | "thread-relative" | "none";
}
