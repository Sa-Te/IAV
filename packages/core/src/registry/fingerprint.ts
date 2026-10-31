/**
 * Shape fingerprint (ADR 0005).
 *
 * The export carries no format version, so we describe what we actually saw: the
 * set of resolved categories plus the key-set of each one's first entry. The
 * result is a short, stable id that a later import can be compared against. A
 * mismatch is a warning for the user, never an error.
 */

export interface ResolvedCategory {
  readonly id: string;
  /** Top-level keys of the category's first entry. */
  readonly keys: readonly string[];
}

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** FNV-1a, 32-bit. Cheap, deterministic and dependency-free; 6 hex chars is ~16M space. */
function fnv1a(input: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function computeFingerprint(resolved: readonly ResolvedCategory[]): string {
  const canonical = resolved
    .map((category) => ({ id: category.id, keys: [...category.keys].sort() }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((category) => `${category.id}:${category.keys.join(",")}`)
    .join("|");

  return `fmt-${fnv1a(canonical).slice(0, 6)}`;
}
