import { CATEGORIES } from "./categories.js";
import type { Category, Signature } from "./types.js";

export interface ResolveInput {
  readonly path: string;
  readonly sample: unknown;
}

export type ResolveResult =
  | { readonly ok: true; readonly id: string; readonly tier: 1 | 2 }
  | { readonly ok: false; readonly reason: "ambiguous"; readonly candidates: readonly string[] }
  | { readonly ok: false; readonly reason: "unrecognised"; readonly path: string };

function normaliseSlashes(path: string): string {
  return path.replace(/\\/g, "/");
}

function basenameOf(path: string): string {
  const parts = normaliseSlashes(path).split("/");
  return parts[parts.length - 1] ?? "";
}

function directorySegments(path: string): readonly string[] {
  return normaliseSlashes(path).split("/").slice(0, -1);
}

function matchesName(category: Category, basename: string, segments: readonly string[]): boolean {
  const byBasename = category.match.basenames.some((pattern) => pattern.test(basename));
  if (!byBasename) {
    return false;
  }

  const parent = category.match.parentSegment;
  if (parent === undefined) {
    return true;
  }

  return segments.some((segment) => parent.test(segment));
}

/** The keys a signature is checked against: the object's, or element[0]'s for arrays. */
function keysOf(signature: Signature, sample: unknown): readonly string[] | null {
  if (signature.kind === "array") {
    if (!Array.isArray(sample) || sample.length === 0) {
      return null;
    }
    const [first] = sample;
    if (first === null || typeof first !== "object" || Array.isArray(first)) {
      return null;
    }
    return Object.keys(first);
  }

  if (sample === null || typeof sample !== "object" || Array.isArray(sample)) {
    return null;
  }
  return Object.keys(sample);
}

function matchesSignature(signature: Signature, sample: unknown): boolean {
  const keys = keysOf(signature, sample);
  if (keys === null) {
    return false;
  }
  const has = (key: string): boolean => keys.includes(key);
  return signature.requiredKeys.every(has) && !(signature.absentKeys ?? []).some(has);
}

/**
 * Tier 2 candidates, most specific first, with specificity measured per
 * *signature*, not per row (ADR 0008).
 *
 * A row may carry one signature per export format it has been measured in, and
 * it fits a sample at the specificity of its **best-fitting** signature: the one
 * needing the most keys. A row also appearing under a looser second signature
 * must not drag its own specificity down.
 *
 * Subset matching alone is too permissive: `posts` is measured with a single
 * top-level key (`media`), so every array entry that happens to carry a `media`
 * field would match it. When several rows match, only those whose best-fitting
 * signature needs the most keys are kept — a sample that satisfies
 * `{fbid,label_values,media,timestamp}` is a better fit for
 * `interest_categories` than for `posts`. Two **different** rows tying at the top
 * remain ambiguous, which is a hard error, not a coin flip.
 */
function shapeMatches(categories: readonly Category[], sample: unknown): readonly string[] {
  const fits = categories.flatMap((category) => {
    const specificities = category.signatures
      .filter((signature) => matchesSignature(signature, sample))
      .map((signature) => signature.requiredKeys.length);
    return specificities.length === 0
      ? []
      : [{ id: category.id, specificity: Math.max(...specificities) }];
  });

  const mostSpecific = Math.max(0, ...fits.map((fit) => fit.specificity));
  return fits.filter((fit) => fit.specificity === mostSpecific).map((fit) => fit.id);
}

/**
 * Three tiers, in order (ADR 0002): basename rule, then structural signature,
 * then the unrecognised bucket. Two rows matching at the same tier is a hard
 * failure — never a coin flip.
 *
 * Tier 2, restated for multiple signatures (ADR 0008): every signature of every
 * row is tried; a row's fit is its best-fitting signature's specificity; the rows
 * tied at the highest specificity are the candidates. So ambiguity is decided
 * between *different rows*, never between two signatures of the same row.
 *
 * A file that is absent from the archive never reaches this function; absence is
 * a caller's normal state, not a resolution outcome.
 *
 * `categories` defaults to the measured registry. It is a parameter so tests can
 * exercise a shape model against invented rows instead of editing measured data.
 */
export function resolveCategory(
  input: ResolveInput,
  categories: readonly Category[] = CATEGORIES,
): ResolveResult {
  const basename = basenameOf(input.path);
  const segments = directorySegments(input.path);

  const byName = categories
    .filter(
      (category) =>
        category.match.basenames.length > 0 && matchesName(category, basename, segments),
    )
    .map((category) => category.id);

  if (byName.length > 1) {
    return { ok: false, reason: "ambiguous", candidates: byName };
  }
  const [nameMatch] = byName;
  if (nameMatch !== undefined) {
    return { ok: true, id: nameMatch, tier: 1 };
  }

  const byShape = shapeMatches(categories, input.sample);

  if (byShape.length > 1) {
    return { ok: false, reason: "ambiguous", candidates: byShape };
  }
  const [shapeMatch] = byShape;
  if (shapeMatch !== undefined) {
    return { ok: true, id: shapeMatch, tier: 2 };
  }

  return { ok: false, reason: "unrecognised", path: input.path };
}
