import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { computeFingerprint, type ResolvedCategory } from "../../src/registry/fingerprint.js";
import { resolveCategory } from "../../src/registry/resolve.js";

/**
 * Integration harness over a synthetic archive. Nothing here touches the real
 * `archive/` — AGENTS.md §9 forbids it, and a fixture that changes shape as the
 * author's life changes is not a test.
 */

const FIXTURES = new URL("../fixtures/synthetic", import.meta.url).pathname;

interface FileOutcome {
  readonly path: string;
  readonly id: string;
  readonly keys: readonly string[];
}

function jsonFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      jsonFiles(full, out);
    } else if (entry.endsWith(".json")) {
      out.push(full);
    }
  }
  return out;
}

function resolveArchive(): readonly FileOutcome[] {
  const outcomes: FileOutcome[] = [];
  for (const file of jsonFiles(FIXTURES).sort()) {
    const path = relative(FIXTURES, file).replace(/\\/g, "/");

    let sample: unknown;
    try {
      sample = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      // A file that will not parse is not a crash; it is data we could not read.
      sample = undefined;
    }

    const result = resolveCategory({ path, sample });
    const id = result.ok ? result.id : result.reason === "ambiguous" ? "ambiguous" : "unrecognised";

    outcomes.push({ path, id, keys: firstEntryKeys(sample) });
  }
  return outcomes;
}

function firstEntryKeys(sample: unknown): readonly string[] {
  const candidate = Array.isArray(sample) ? sample[0] : sample;
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return [];
  }
  return Object.keys(candidate).sort();
}

function toFingerprintInput(outcomes: readonly FileOutcome[]): readonly ResolvedCategory[] {
  return outcomes.map((outcome) => ({ id: outcome.id, keys: outcome.keys }));
}

describe("resolveArchive over the synthetic fixture archive", () => {
  it("resolves every file to the expected category", () => {
    const outcomes = resolveArchive();
    const counts: Record<string, number> = {};
    for (const outcome of outcomes) {
      counts[outcome.id] = (counts[outcome.id] ?? 0) + 1;
    }

    expect(counts).toEqual({
      posts: 1,
      stories: 1,
      messages_inbox: 1,
      messages_requests: 1,
      unrecognised: 3,
    });
  });

  it("lands the malformed file in the unrecognised bucket without throwing", () => {
    const outcomes = resolveArchive();
    const broken = outcomes.find((outcome) => outcome.path === "broken.json");
    expect(broken?.id).toBe("unrecognised");
  });

  it("survives the empty file", () => {
    const outcomes = resolveArchive();
    const empty = outcomes.find((outcome) => outcome.path === "empty.json");
    expect(empty?.id).toBe("unrecognised");
  });

  it("puts the unknown-shaped file in the unrecognised bucket", () => {
    const outcomes = resolveArchive();
    const unknown = outcomes.find((outcome) => outcome.path === "unknown.json");
    expect(unknown?.id).toBe("unrecognised");
  });

  it("separates the two threads by parent folder", () => {
    const outcomes = resolveArchive();
    const inbox = outcomes.find((outcome) => outcome.path.includes("/inbox/"));
    const requests = outcomes.find((outcome) => outcome.path.includes("/message_requests/"));
    expect(inbox?.id).toBe("messages_inbox");
    expect(requests?.id).toBe("messages_requests");
  });

  it("produces a stable fingerprint across two runs", () => {
    const first = computeFingerprint(toFingerprintInput(resolveArchive()));
    const second = computeFingerprint(toFingerprintInput(resolveArchive()));
    expect(first).toBe(second);
    expect(first).toMatch(/^fmt-[0-9a-f]{6}$/);
  });
});
