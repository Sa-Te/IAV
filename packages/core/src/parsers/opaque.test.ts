import { describe, expect, it } from "vitest";

import { findCategory } from "../registry/categories.js";
import { signatureMatches } from "../registry/resolve.js";
import { parseOpaque } from "./opaque.js";

/**
 * The twelve categories promoted in M7b. Every fixture is synthetic and shaped
 * after the measured file (keys and container kind, `archive-2/`, 2026-10-31);
 * no slice of the real export is used anywhere (AGENTS.md §9).
 *
 * One shared parser, so the malformed and empty cases are tested once on the
 * parser rather than twelve times per category — the per-category fixtures below
 * are what prove the registry row and the file still describe each other.
 */

const ENVELOPE = { fbid: "100000000000001", label_values: [{ value: "example" }], media: [] };

const FIXTURES: readonly {
  readonly id: string;
  readonly kind: "array" | "object";
  readonly value: unknown;
  readonly entries: number;
}[] = [
  {
    id: "ad_preferences",
    kind: "object",
    value: { ...ENVELOPE, timestamp: 1_700_000_000 },
    entries: 1,
  },
  {
    id: "device_camera_effects_support",
    kind: "array",
    value: [{ ...ENVELOPE, timestamp: 1 }],
    entries: 1,
  },
  {
    id: "posts_you're_interested_or_not_interested_in",
    kind: "array",
    value: [
      { ...ENVELOPE, timestamp: 1 },
      { ...ENVELOPE, timestamp: 2 },
    ],
    entries: 2,
  },
  {
    id: "subscription_for_no_ads",
    kind: "object",
    value: { ...ENVELOPE, timestamp: 1 },
    entries: 1,
  },
  { id: "profile_activity", kind: "array", value: [{ ...ENVELOPE, timestamp: 1 }], entries: 1 },
  { id: "stories_viewed", kind: "array", value: [{ ...ENVELOPE, timestamp: 1 }], entries: 1 },
  {
    id: "your_ownership_of_digital_items",
    kind: "array",
    value: [
      {
        ...ENVELOPE,
        media: [{ uri: "your_instagram_activity/posts/media/your_posts/000001.png" }],
        timestamp: 1,
      },
    ],
    entries: 1,
  },
  {
    id: "instants_interactions",
    kind: "array",
    value: [{ ...ENVELOPE, timestamp: 1 }],
    entries: 1,
  },
  { id: "other_content", kind: "array", value: [{ ...ENVELOPE, timestamp: 1 }], entries: 1 },
  {
    id: "ai_conversations",
    kind: "array",
    value: [{ ...ENVELOPE, timestamp: 1, title: "A synthetic conversation" }],
    entries: 1,
  },
  {
    id: "checkout_payment_information",
    kind: "object",
    value: { ...ENVELOPE, timestamp: 1 },
    entries: 1,
  },
  {
    id: "threads_viewed",
    kind: "object",
    value: { text_post_app_text_post_app_posts_seen: [{ value: "example" }] },
    entries: 1,
  },
];

describe("promoted opaque categories", () => {
  for (const fixture of FIXTURES) {
    describe(fixture.id, () => {
      it("has a registry row whose signature matches its measured shape", () => {
        const category = findCategory(fixture.id);
        expect(category, `${fixture.id} is not in the registry`).toBeDefined();
        expect(
          category?.signatures.some((signature) => signatureMatches(signature, fixture.value)),
        ).toBe(true);
      });

      it("parses and preserves the payload exactly", () => {
        const result = parseOpaque(fixture.value, fixture.kind);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data).toHaveLength(fixture.entries);
        // Verbatim: the same object graph, not a normalised copy of it.
        expect(result.data[0]).toEqual(
          Array.isArray(fixture.value) ? fixture.value[0] : fixture.value,
        );
        expect(result.warnings).toEqual([]);
      });
    });
  }
});

describe("parseOpaque — negative and empty cases", () => {
  it("refuses the wrong container kind instead of throwing", () => {
    for (const value of [null, undefined, "text", 42, { a: 1 }]) {
      expect(parseOpaque(value, "array")).toMatchObject({ ok: false, raw: value });
    }
    for (const value of [null, [], "text", 42]) {
      expect(parseOpaque(value, "object")).toMatchObject({ ok: false, raw: value });
    }
  });

  it("reads an empty array as zero entries", () => {
    expect(parseOpaque([], "array")).toEqual({ ok: true, data: [], warnings: [] });
  });

  it("reads an empty object as one opaque entry, not as absence", () => {
    expect(parseOpaque({}, "object")).toEqual({ ok: true, data: [{}], warnings: [] });
  });

  it("keeps a key nobody has seen before", () => {
    const result = parseOpaque([{ ...ENVELOPE, a_key_from_a_future_export: true }], "array");

    expect(result.ok && result.data[0]).toEqual({ ...ENVELOPE, a_key_from_a_future_export: true });
  });
});
