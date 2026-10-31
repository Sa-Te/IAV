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

function sampleFor(category: Category): unknown {
  const signature = category.signature;
  if (signature === null) {
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
    if (category.signature === null) {
      continue;
    }
    it(`${category.id}`, () => {
      const result = resolveCategory({ path: pathFor(category), sample: sampleFor(category) });
      expect(result).toEqual({ ok: true, id: category.id, tier: 1 });
    });
  }
});
