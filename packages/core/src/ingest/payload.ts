/**
 * Helpers for the parsed payload: shapes for unrecognised data, merging two files
 * of the same category, and the pre-import drift report.
 *
 * Everything here is structural. Content never leaves these functions.
 */

import type { DriftReport } from "./port.js";
import type { UnrecognisedShape } from "./job.js";
import { basenameOf } from "./zipEntries.js";

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function entryCountOf(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (isPlainObject(value)) {
    // A single label/value envelope is ONE entry. Its `label_values` array
    // describes that entry, so counting it would report "3 entries" for a row
    // with three labels — and "0" when the labels happened to be empty.
    if (Array.isArray(value.label_values)) return 1;
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) return child.length;
    }
  }
  return 0;
}

export function firstEntryKeys(value: unknown): readonly string[] {
  const entry = Array.isArray(value) ? value[0] : value;
  return isPlainObject(entry) ? Object.keys(entry).sort() : [];
}

export function kindOf(value: unknown): UnrecognisedShape["kind"] {
  if (Array.isArray(value)) return "array";
  return isPlainObject(value) ? "object" : "scalar";
}

/** Every non-empty `uri` string, at any depth. */
export function collectUris(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectUris(item, out);
  } else if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (key === "uri" && typeof child === "string" && child.length > 0) {
        out.push(child);
      } else {
        collectUris(child, out);
      }
    }
  }
  return out;
}

/**
 * One category can arrive as several files (`posts_1.json` + `posts_2.json`), so
 * merging must be **additive**: nothing a file contains may be dropped.
 *
 * - every payload an array → one concatenated list (the same category split by
 *   Instagram, which is what the two files mean);
 * - otherwise → the payloads themselves, one per file, in file order.
 *
 * The second rule is why this is not a deep object merge: merging two thread
 * objects key-by-key keeps the last `title` and `thread_path`, i.e. one file
 * silently overwrites another. A list of payloads loses nothing, and the record's
 * `sources` says which file each entry came from.
 */
export function mergePayloads(payloads: readonly unknown[]): unknown {
  const [first] = payloads;
  if (payloads.length === 1) return first;
  if (payloads.length === 0) return undefined;
  if (payloads.every((payload) => Array.isArray(payload))) {
    return payloads.flatMap((payload) => payload as readonly unknown[]);
  }
  return [...payloads];
}

export function computeDrift(
  previousFingerprint: string | null,
  nextFingerprint: string,
  previousIds: readonly string[],
  nextIds: readonly string[],
): DriftReport | null {
  if (previousFingerprint === null) return null;
  const before = new Set(previousIds);
  const after = new Set(nextIds);
  return {
    previousFingerprint,
    nextFingerprint,
    addedCategories: [...after].filter((id) => !before.has(id)).sort(),
    removedCategories: [...before].filter((id) => !after.has(id)).sort(),
  };
}

export function unrecognisedShape(name: string, value: unknown): UnrecognisedShape {
  return {
    basename: basenameOf(name),
    kind: kindOf(value),
    keys: firstEntryKeys(value).slice(0, 12),
    entryCount: entryCountOf(value),
  };
}
