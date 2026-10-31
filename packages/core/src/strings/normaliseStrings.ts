import { fixMojibake } from "./fixMojibake.js";

function walk(value: unknown): unknown {
  if (typeof value === "string") {
    return fixMojibake(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => walk(item));
  }

  if (typeof value === "object" && value !== null) {
    // Safe: the guard above proves this is a non-null, non-array object, so it is
    // a string-keyed record as far as JSON is concerned.
    const source = value as Readonly<Record<string, unknown>>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      // Keys are never transformed: they are structural, and a mojibake key is a
      // different bug that this function must not silently "fix".
      result[key] = walk(source[key]);
    }
    return result;
  }

  return value;
}

/**
 * Applies `fixMojibake` to every string **value** in a parsed archive, at any
 * depth, and returns a new structure (ADR 0003). Keys, numbers, booleans, nulls
 * and anything else pass through untouched.
 *
 * The cast is the boundary of a deep structural transform: the input shape is
 * preserved element-for-element, which TypeScript cannot express for `unknown`.
 */
export function normaliseStrings<T>(value: T): T {
  return walk(value) as T;
}
