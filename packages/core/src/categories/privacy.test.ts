import { describe, expect, it } from "vitest";

import { CATEGORIES } from "../registry/categories.js";
import { isGated, revealCopy } from "./privacy.js";

/**
 * Two axes, not one (ADR 0014): tier 5 gates because the category *is* other
 * people's text; a T3 comment category gates because it *contains* other people's
 * words while still being the reader's own content.
 */

describe("isGated — the gate is not the tier", () => {
  it("gates a T3 category flagged gated", () => {
    expect(isGated("post_comments")).toBe(true);
    expect(isGated("liked_comments")).toBe(true);
    expect(isGated("reels_comments")).toBe(true);
  });

  it("does not gate a T3 category that carries no third-party text", () => {
    expect(isGated("saved_posts")).toBe(false);
    expect(isGated("liked_posts")).toBe(false);
    expect(isGated("posts")).toBe(false);
  });

  it("gates synced contacts while leaving it in T4 (D2, M23)", () => {
    expect(isGated("synced_contacts")).toBe(true);
    const synced = CATEGORIES.find((category) => category.id === "synced_contacts");
    expect(synced?.privacyTier).toBe(4);
    expect(synced?.gated).toBe(true);
    for (const id of ["followers", "following", "blocked_profiles"]) {
      expect(isGated(id)).toBe(false);
    }
  });

  it("still gates every T5 category", () => {
    const t5 = CATEGORIES.filter((category) => category.privacyTier === 5);
    expect(t5.length).toBeGreaterThan(0);
    for (const category of t5) {
      expect(isGated(category.id)).toBe(true);
    }
  });

  it("says yes once for a row that is both T5 and gated — no second gate", () => {
    // No measured row is both today. The invariant is what keeps a future one
    // from producing a nested gate: the answer is one boolean, and the caller
    // mounts one `RevealGate`.
    const both = CATEGORIES.filter(
      (category) => category.privacyTier === 5 && category.gated === true,
    );
    expect(both).toEqual([]);
    expect(isGated("messages_inbox")).toBe(true);
  });

  it("does not gate an unknown id", () => {
    expect(isGated("not_a_category")).toBe(false);
  });
});

describe("revealCopy — what is inside, in the reader's words", () => {
  it("names the third-party words in each comment category", () => {
    for (const id of ["post_comments", "reels_comments", "liked_comments"]) {
      const copy = revealCopy(id);
      expect(copy.body).toContain("other people wrote");
    }
  });

  it("keeps each category's copy distinct", () => {
    const bodies = ["post_comments", "reels_comments", "liked_comments", "messages_inbox"].map(
      (id) => revealCopy(id).body,
    );
    expect(new Set(bodies).size).toBe(bodies.length);
  });

  it("falls back honestly for a gated category with no measured copy", () => {
    expect(revealCopy("not_a_category").title).toBe("Third-party authored text");
  });
});
