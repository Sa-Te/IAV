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
  /**
   * A second, independent reason to ask before rendering (ADR 0014).
   *
   * The tier answers "whose data is this?" and is a label, not a lock (ADR 0009).
   * The gate answers "was this written by someone else?" — a comment, a message —
   * and is shown behind an explicit reveal even when the category is the reader's
   * own content (T3). It is deliberately separate from `privacyTier`: comments stay
   * on the T3 page while still gating.
   */
  readonly gated?: boolean;
  readonly variantRisk: "low" | "medium" | "high";
  readonly match: CategoryMatch;
  /**
   * Every shape this category has been measured in, one per export format
   * (ADR 0008). Empty means "name-resolvable only" — a row may legitimately have
   * no measured shape, and then tier 2 never matches it.
   */
  readonly signatures: readonly Signature[];
  readonly mediaPath: "root-relative" | "thread-relative" | "none";
}
