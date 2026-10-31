/**
 * Drift: what changed between two exports of the same account (M7).
 *
 * Structural only. The input is parsed JSON read by a caller (the browser never
 * sees this module; `scripts/drift.mjs` does), and the output carries category
 * ids, key *names*, counts and fingerprints — never a string value and never a
 * file basename. `privacy.test.ts` enforces that on the rendered report.
 *
 * Resolution and the fingerprint are reused from the registry, not reimplemented:
 * a drift measurement that disagreed with ingestion would be measuring itself.
 */
import { CATEGORIES } from "../registry/categories.js";
import { computeFingerprint } from "../registry/fingerprint.js";
import { resolveCategory, signatureMatches } from "../registry/resolve.js";
import type { Category } from "../registry/types.js";
import {
  collectUris,
  entryCountOf,
  firstEntryKeys,
  isPlainObject,
  unrecognisedShape,
} from "../ingest/payload.js";
import type { UnrecognisedShape } from "../ingest/job.js";
import { dirnameOf, isMediaEntry } from "../ingest/zipEntries.js";
import { fixMojibake } from "../strings/fixMojibake.js";
import { declaredBase, resolveReference, type MediaBase } from "../domain/mediaPath.js";

export interface JsonFile {
  readonly path: string;
  readonly value: unknown;
}

export interface MediaFile {
  readonly path: string;
  readonly bytes: number;
}

/** One export as read off disk. `label` is a directory name, never a full path. */
export interface ArchiveInput {
  readonly label: string;
  readonly json: readonly JsonFile[];
  readonly media: readonly MediaFile[];
}

export type MediaPathUsed = MediaBase | "mixed" | "none";

export interface CategoryShape {
  readonly id: string;
  readonly tier: 1 | 2;
  readonly entryCount: number;
  readonly keys: readonly string[];
  /** One boolean per signature on the registry row, in row order (ADR 0008). */
  readonly signaturesStillSatisfied: readonly boolean[];
  readonly mediaPathUsed: MediaPathUsed;
  readonly mediaRefs: number;
  readonly mediaMissing: number;
}

export interface ArchiveShape {
  readonly label: string;
  readonly fingerprint: string;
  readonly files: number;
  readonly jsonFiles: number;
  readonly categories: readonly CategoryShape[];
  readonly unrecognised: readonly UnrecognisedShape[];
  readonly media: { readonly files: number; readonly bytes: number; readonly orphans: number };
  readonly mojibake: { readonly strings: number; readonly categories: number };
  readonly entries: number;
}

export interface ChangedCategory {
  readonly id: string;
  readonly entryCount: { readonly a: number; readonly b: number };
  readonly keysAdded: readonly string[];
  readonly keysRemoved: readonly string[];
  readonly signaturesStillSatisfied: {
    readonly a: readonly boolean[];
    readonly b: readonly boolean[];
  };
  readonly mediaPathUsed: { readonly a: MediaPathUsed; readonly b: MediaPathUsed };
  readonly media: {
    readonly refsA: number;
    readonly refsB: number;
    readonly missingA: number;
    readonly missingB: number;
  };
}

export interface DriftReport {
  readonly labels: { readonly a: string; readonly b: string };
  readonly fingerprints: { readonly a: string; readonly b: string };
  readonly categoriesOnlyInA: readonly string[];
  readonly categoriesOnlyInB: readonly string[];
  readonly changed: readonly ChangedCategory[];
  readonly unrecognised: {
    readonly a: readonly UnrecognisedShape[];
    readonly b: readonly UnrecognisedShape[];
  };
  readonly media: {
    readonly filesA: number;
    readonly filesB: number;
    readonly bytesA: number;
    readonly bytesB: number;
    readonly orphansA: number;
    readonly orphansB: number;
  };
  readonly mojibake: {
    readonly stringsA: number;
    readonly stringsB: number;
    readonly categoriesA: number;
    readonly categoriesB: number;
  };
}

function countMojibake(value: unknown): number {
  if (typeof value === "string") return fixMojibake(value) === value ? 0 : 1;
  if (Array.isArray(value))
    return value.reduce<number>((sum, item) => sum + countMojibake(item), 0);
  if (isPlainObject(value)) {
    return Object.values(value).reduce<number>((sum, child) => sum + countMojibake(child), 0);
  }
  return 0;
}

function mediaPathUsedOf(bases: readonly MediaBase[]): MediaPathUsed {
  const unique = new Set(bases);
  if (unique.size === 0) return "none";
  if (unique.size > 1) return "mixed";
  const [only] = [...unique];
  return only ?? "none";
}

interface CategoryAccumulator {
  tier: 1 | 2;
  /** Every file that resolved to this id, kept apart so nothing is folded away. */
  payloads: unknown[];
  bases: MediaBase[];
  refs: number;
  missing: number;
}

/**
 * Measure one export. Merging, counting and mojibake detection are the same
 * helpers ingestion uses, so `fingerprint` here equals the one `pnpm ingest:report`
 * prints for the same directory.
 *
 * `registry` defaults to the measured registry; it is a parameter so tests can
 * measure against invented rows instead of editing measured data (ADR 0008).
 */
export function buildArchiveShape(
  input: ArchiveInput,
  registry: readonly Category[] = CATEGORIES,
): ArchiveShape {
  const rows: ReadonlyMap<string, Category> = new Map(registry.map((row) => [row.id, row]));
  const names = new Set(input.media.map((file) => file.path));
  const byId = new Map<string, CategoryAccumulator>();
  const unrecognised: UnrecognisedShape[] = [];
  const resolvedPaths = new Set<string>();
  let mojibakeStrings = 0;

  for (const file of input.json) {
    mojibakeStrings += countMojibake(file.value);

    const resolved = resolveCategory({ path: file.path, sample: file.value }, registry);
    if (!resolved.ok) {
      unrecognised.push(unrecognisedShape(file.path, file.value));
      continue;
    }

    const accumulator: CategoryAccumulator = byId.get(resolved.id) ?? {
      tier: resolved.tier,
      payloads: [],
      bases: [],
      refs: 0,
      missing: 0,
    };
    accumulator.payloads.push(file.value);

    const declared = declaredBase(rows.get(resolved.id));
    if (declared !== null) {
      const dir = dirnameOf(file.path);
      for (const uri of collectUris(file.value)) {
        accumulator.refs += 1;
        const hit = resolveReference(uri, dir, declared, (candidate) => names.has(candidate));
        if (hit === null) {
          accumulator.missing += 1;
        } else {
          accumulator.bases.push(hit.base);
          resolvedPaths.add(hit.path);
        }
      }
    }

    byId.set(resolved.id, accumulator);
  }

  const categories: CategoryShape[] = [...byId.entries()].map(([id, accumulator]) => {
    const row = rows.get(id);
    const [firstPayload] = accumulator.payloads;
    return {
      id,
      tier: accumulator.tier,
      // Summed across files, exactly as ingestion counts a category.
      entryCount: accumulator.payloads.reduce<number>(
        (sum, payload) => sum + entryCountOf(payload),
        0,
      ),
      // ADR 0005's "first entry": the first file's, for a multi-file category.
      keys: firstEntryKeys(firstPayload),
      // A signature is satisfied if *any* file the row claimed matches it: that is
      // what "this row describes this export" means once a row spans two files.
      signaturesStillSatisfied: (row?.signatures ?? []).map((signature) =>
        accumulator.payloads.some((payload) => signatureMatches(signature, payload)),
      ),
      mediaPathUsed: mediaPathUsedOf(accumulator.bases),
      mediaRefs: accumulator.refs,
      mediaMissing: accumulator.missing,
    };
  });

  const categoriesWithMojibake = categories.filter((category) => {
    const accumulator = byId.get(category.id);
    return (
      accumulator !== undefined &&
      accumulator.payloads.some((payload) => countMojibake(payload) > 0)
    );
  }).length;

  return {
    label: input.label,
    fingerprint: computeFingerprint(
      categories.map((category) => ({ id: category.id, keys: category.keys })),
    ),
    files: input.json.length + input.media.length,
    jsonFiles: input.json.length,
    categories,
    unrecognised,
    media: {
      files: input.media.length,
      bytes: input.media.reduce((sum, file) => sum + file.bytes, 0),
      orphans: input.media.filter(
        (file) => isMediaEntry(file.path) && !resolvedPaths.has(file.path),
      ).length,
    },
    mojibake: { strings: mojibakeStrings, categories: categoriesWithMojibake },
    entries: categories.reduce((sum, category) => sum + category.entryCount, 0),
  };
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function sameFlags(a: readonly boolean[], b: readonly boolean[]): boolean {
  return a.length === b.length && a.every((flag, index) => flag === b[index]);
}

function compareCategory(a: CategoryShape, b: CategoryShape): ChangedCategory | null {
  const keysAdded = b.keys.filter((key) => !a.keys.includes(key));
  const keysRemoved = a.keys.filter((key) => !b.keys.includes(key));
  const changed =
    !sameList(keysAdded, []) ||
    !sameList(keysRemoved, []) ||
    a.entryCount !== b.entryCount ||
    !sameFlags(a.signaturesStillSatisfied, b.signaturesStillSatisfied) ||
    a.mediaPathUsed !== b.mediaPathUsed ||
    a.mediaRefs !== b.mediaRefs ||
    a.mediaMissing !== b.mediaMissing;

  if (!changed) return null;
  return {
    id: a.id,
    entryCount: { a: a.entryCount, b: b.entryCount },
    keysAdded,
    keysRemoved,
    signaturesStillSatisfied: { a: a.signaturesStillSatisfied, b: b.signaturesStillSatisfied },
    mediaPathUsed: { a: a.mediaPathUsed, b: b.mediaPathUsed },
    media: {
      refsA: a.mediaRefs,
      refsB: b.mediaRefs,
      missingA: a.mediaMissing,
      missingB: b.mediaMissing,
    },
  };
}

function sorted(values: readonly string[]): readonly string[] {
  return [...values].sort();
}

/**
 * Two exports in, one report out. A category is "changed" if its entry count, its
 * key-set, any single signature's satisfaction, or its measured media path
 * differs — so a shape change with an unchanged name cannot hide.
 */
export function compareShapes(a: ArchiveShape, b: ArchiveShape): DriftReport {
  const idsA = new Set(a.categories.map((category) => category.id));
  const idsB = new Set(b.categories.map((category) => category.id));
  const changed: ChangedCategory[] = [];
  for (const category of a.categories) {
    const other = b.categories.find((candidate) => candidate.id === category.id);
    if (other === undefined) continue;
    const diff = compareCategory(category, other);
    if (diff !== null) changed.push(diff);
  }

  return {
    labels: { a: a.label, b: b.label },
    fingerprints: { a: a.fingerprint, b: b.fingerprint },
    categoriesOnlyInA: sorted([...idsA].filter((id) => !idsB.has(id))),
    categoriesOnlyInB: sorted([...idsB].filter((id) => !idsA.has(id))),
    changed,
    unrecognised: { a: a.unrecognised, b: b.unrecognised },
    media: {
      filesA: a.media.files,
      filesB: b.media.files,
      bytesA: a.media.bytes,
      bytesB: b.media.bytes,
      orphansA: a.media.orphans,
      orphansB: b.media.orphans,
    },
    mojibake: {
      stringsA: a.mojibake.strings,
      stringsB: b.mojibake.strings,
      categoriesA: a.mojibake.categories,
      categoriesB: b.mojibake.categories,
    },
  };
}
