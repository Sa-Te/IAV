import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CATEGORIES } from "./categories.js";
import { resolveCategory } from "./resolve.js";
import type { Category } from "./types.js";

/**
 * The data-driven test that makes the registry safe to edit: it iterates the
 * registry itself, so adding a row without a signature, or renaming a category
 * in one place and not the other, fails here.
 */

const DATA_MAP_URL = new URL("../../../../docs/DATA-MAP.md", import.meta.url);

function basenameFor(category: Category): string {
  // Message threads share one basename; every other category is named after its id.
  return category.match.parentSegment === undefined ? `${category.id}.json` : "message_1.json";
}

function pathFor(category: Category): string {
  const parent = category.match.parentSegment;
  if (parent === undefined) {
    return basenameFor(category);
  }
  const folder = ["inbox", "message_requests"].find((segment) => parent.test(segment));
  if (folder === undefined) {
    throw new Error(`registry test cannot build a path for ${category.id}`);
  }
  return `messages/${folder}/thread_${category.id}/${basenameFor(category)}`;
}

function sampleFor(category: Category, index: number): unknown {
  const signature = category.signatures[index];
  if (signature === undefined) {
    return undefined;
  }
  const entry: Record<string, null> = {};
  for (const key of signature.requiredKeys) {
    entry[key] = null;
  }
  return signature.kind === "array" ? [entry] : entry;
}

function dataMapIds(): readonly string[] {
  const markdown = readFileSync(DATA_MAP_URL, "utf8");
  const ids: string[] = [];
  for (const line of markdown.split("\n")) {
    // Any status counts: a finished category must not look deleted to this test.
    const match = /^\|\s*`([^`]+)`\s*\|(?:[^|]*\|){5}[^|]*\|\s*$/.exec(line);
    const raw = match?.[1];
    if (raw === undefined) {
      continue;
    }
    ids.push(raw === "(unrecognised bucket)" ? "unrecognised" : raw);
  }
  return ids;
}

describe("registry", () => {
  it("has unique ids", () => {
    const ids = CATEGORIES.map((category) => category.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
  });

  it("gives every category a basename rule", () => {
    // The unrecognised bucket is the only row allowed to match nothing by name.
    const withoutRule = CATEGORIES.filter(
      (category) => category.id !== "unrecognised" && category.match.basenames.length === 0,
    ).map((category) => category.id);
    expect(withoutRule).toEqual([]);
  });

  it("keeps every basename rule in sync with its id", () => {
    for (const category of CATEGORIES) {
      if (category.id === "unrecognised") continue;
      const basename = basenameFor(category);
      expect(
        category.match.basenames.some((pattern) => pattern.test(basename)),
        `${category.id} does not match its own basename "${basename}"`,
      ).toBe(true);
    }
  });

  it("matches docs/DATA-MAP.md exactly, in both directions", () => {
    const inDoc = new Set(dataMapIds());
    const inRegistry = new Set(CATEGORIES.map((category) => category.id));

    expect(
      inDoc.size,
      "docs/DATA-MAP.md yielded no ids — did the table format change?",
    ).toBeGreaterThan(70);

    const missingFromRegistry = [...inDoc].filter((id) => !inRegistry.has(id)).sort();
    const missingFromDoc = [...inRegistry].filter((id) => !inDoc.has(id)).sort();

    expect({ missingFromRegistry, missingFromDoc }).toEqual({
      missingFromRegistry: [],
      missingFromDoc: [],
    });
  });
});

describe("registry — every row resolves to itself", () => {
  for (const category of CATEGORIES) {
    category.signatures.forEach((_signature, index) => {
      it(`${category.id} — signature ${index + 1} of ${category.signatures.length}`, () => {
        const result = resolveCategory({
          path: pathFor(category),
          sample: sampleFor(category, index),
        });
        expect(result).toEqual({ ok: true, id: category.id, tier: 1 });
      });
    });
  }

  it("treats a row with no measured signature as name-resolvable only", () => {
    // Only the unrecognised bucket and reels are signature-less: reels is
    // registered by name before any export has been measured for it (D2).
    const nameless: readonly Category[] = [
      {
        id: "only_by_name",
        label: "Only by name",
        privacyTier: 1,
        variantRisk: "low",
        match: { basenames: [/^only_by_name(?:_\d+)?\.json$/i] },
        signatures: [],
        mediaPath: "none",
      },
      {
        id: "shaped",
        label: "Has a shape",
        privacyTier: 1,
        variantRisk: "low",
        match: { basenames: [/^shaped(?:_\d+)?\.json$/i] },
        signatures: [{ kind: "object", requiredKeys: ["a", "b"] }],
        mediaPath: "none",
      },
    ];

    const byName = resolveCategory({ path: "only_by_name_2.json", sample: {} }, nameless);
    expect(byName).toEqual({ ok: true, id: "only_by_name", tier: 1 });

    // Same sample, foreign name: the empty list must contribute no candidate at
    // all, so the row with a signature wins instead of tying.
    const byShape = resolveCategory({ path: "renamed.json", sample: { a: 1, b: 2 } }, nameless);
    expect(byShape).toEqual({ ok: true, id: "shaped", tier: 2 });
  });

  it("resolves a row with two measured signatures under both of them", () => {
    const dual: readonly Category[] = [
      {
        id: "dual",
        label: "Two measured shapes",
        privacyTier: 1,
        variantRisk: "low",
        match: { basenames: [/^dual(?:_\d+)?\.json$/i] },
        signatures: [
          { kind: "object", requiredKeys: ["named_wrapper"] },
          { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
        ],
        mediaPath: "none",
      },
    ];

    expect(resolveCategory({ path: "renamed.json", sample: { named_wrapper: [] } }, dual)).toEqual({
      ok: true,
      id: "dual",
      tier: 2,
    });
    expect(
      resolveCategory(
        {
          path: "renamed.json",
          sample: [{ fbid: "1", label_values: [], media: [], timestamp: 1 }],
        },
        dual,
      ),
    ).toEqual({ ok: true, id: "dual", tier: 2 });
  });

  it("scores a row by its best-fitting signature when a looser one also matches", () => {
    // `loose` requires one key and is satisfied by `{a, b}`; `strict` requires two.
    // The tier-2 tie-break must compare best-fitting signatures, so `strict` wins
    // and `loose` is not reported as a tie.
    const rows: readonly Category[] = [
      {
        id: "loose",
        label: "Loose",
        privacyTier: 1,
        variantRisk: "low",
        match: { basenames: [/^loose(?:_\d+)?\.json$/i] },
        signatures: [{ kind: "object", requiredKeys: ["a"] }],
        mediaPath: "none",
      },
      {
        id: "strict",
        label: "Strict",
        privacyTier: 1,
        variantRisk: "low",
        match: { basenames: [/^strict(?:_\d+)?\.json$/i] },
        signatures: [
          { kind: "object", requiredKeys: ["a"] },
          { kind: "object", requiredKeys: ["a", "b"] },
        ],
        mediaPath: "none",
      },
    ];

    expect(resolveCategory({ path: "renamed.json", sample: { a: 1, b: 2 } }, rows)).toEqual({
      ok: true,
      id: "strict",
      tier: 2,
    });
  });

  it("is still a hard error when two different rows tie at the top", () => {
    const rows: readonly Category[] = [
      {
        id: "first",
        label: "First",
        privacyTier: 1,
        variantRisk: "low",
        match: { basenames: [/^first(?:_\d+)?\.json$/i] },
        signatures: [{ kind: "object", requiredKeys: ["a", "b"] }],
        mediaPath: "none",
      },
      {
        id: "second",
        label: "Second",
        privacyTier: 1,
        variantRisk: "low",
        match: { basenames: [/^second(?:_\d+)?\.json$/i] },
        signatures: [{ kind: "object", requiredKeys: ["a", "b"] }],
        mediaPath: "none",
      },
    ];

    expect(resolveCategory({ path: "renamed.json", sample: { a: 1, b: 2 } }, rows)).toEqual({
      ok: false,
      reason: "ambiguous",
      candidates: ["first", "second"],
    });
  });
});
