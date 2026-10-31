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

/** Two files for one category (`posts_1.json`, `posts_2.json`) merge, never replace. */
export function mergeValues(a: unknown, b: unknown): unknown {
  if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
  if (isPlainObject(a) && isPlainObject(b)) {
    const merged: Record<string, unknown> = { ...a };
    for (const key of Object.keys(b)) {
      merged[key] = key in merged ? mergeValues(merged[key], b[key]) : b[key];
    }
    return merged;
  }
  return b;
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
