/**
 * The category registry: data, not code (ADR 0002). Adding a category is one row.
 *
 * Ids, privacy tiers and variant risks are copied from docs/DATA-MAP.md; match
 * rules and structural signatures are derived from docs/archive-manifest.md,
 * which was measured against a real export. `registry.test.ts` fails if this file
 * and DATA-MAP.md drift apart.
 *
 * The data lives in per-tier files so no single file crosses the 400-line gate
 * (AGENTS.md §5). This module still exports one array.
 */
import type { Category } from "./types.js";

import { TIER_1 } from "./data/tier1.js";
import { TIER_2 } from "./data/tier2.js";
import { TIER_3 } from "./data/tier3.js";
import { TIER_4 } from "./data/tier4.js";
import { TIER_5 } from "./data/tier5.js";

/**
 * ADR 0002 tier 3. Not a category: everything no rule matched ends up here, and
 * it is never absent. Tier 5 because its contents are unknown and may be anything.
 *
 * TODO(signature): a signature is impossible by definition — this bucket is
 * defined by having no signature. That is the missing measurement, and it is
 * permanently missing, not pending.
 */
export const UNRECOGNISED: Category = {
  id: "unrecognised",
  label: "Unrecognised data",
  privacyTier: 5,
  variantRisk: "high",
  match: { basenames: [] },
  signature: null,
  mediaPath: "none",
};

export const CATEGORIES: readonly Category[] = [
  ...TIER_1,
  ...TIER_2,
  ...TIER_3,
  ...TIER_4,
  ...TIER_5,
  UNRECOGNISED,
];
