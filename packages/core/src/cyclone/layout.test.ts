import { describe, expect, it } from "vitest";

import { GOLDEN_ANGLE, totalHeightOf, vortexLayout, VERTICAL_SPACING } from "./layout.js";

const OPTS = { cardAspect: 1 } as const;

describe("vortexLayout", () => {
  it("returns nothing for an empty sequence", () => {
    expect(vortexLayout(0, 0, OPTS)).toEqual([]);
  });

  it("puts a single card at the origin angle", () => {
    const [only] = vortexLayout(1, 0, OPTS);

    expect(only?.index).toBe(0);
    expect(only?.angle).toBe(0);
    // One card, phase 0: centred in its own band.
    expect(only?.y).toBeCloseTo(-VERTICAL_SPACING / 2, 10);
  });

  it("is deterministic", () => {
    expect(vortexLayout(405, 12.5, OPTS)).toEqual(vortexLayout(405, 12.5, OPTS));
  });

  it("turns each card by the golden angle", () => {
    const cards = vortexLayout(3, 0, OPTS);

    expect(cards.map((card) => card.angle)).toEqual([0, GOLDEN_ANGLE, GOLDEN_ANGLE * 2]);
  });

  it("wraps continuously: a card leaving the top re-enters at the bottom", () => {
    // Advancing by exactly one spiral height must be visually identical, which is
    // what makes the scroll endless with no seam or growing array.
    const before = vortexLayout(405, 3, OPTS);
    const after = vortexLayout(405, 3 + totalHeightOf(405), OPTS);

    expect(after).toHaveLength(before.length);
    before.forEach((card, index) => {
      // Floating-point addition of one full height is exact only to ~1e-13; the
      // property that matters is that nothing jumps.
      expect(after[index]?.y).toBeCloseTo(card.y, 9);
      expect(after[index]?.angle).toBe(card.angle);
      expect(after[index]?.radius).toBeCloseTo(card.radius, 9);
    });
  });

  it("keeps every card inside the centred band and at the same radius around the ring", () => {
    const cards = vortexLayout(50, 7, OPTS);
    const half = totalHeightOf(50) / 2;

    for (const card of cards) {
      expect(card.y).toBeGreaterThanOrEqual(-half);
      expect(card.y).toBeLessThan(half);
      // The radius breathes, but only slightly: a vortex, not a cylinder or a wave.
      expect(card.radius).toBeGreaterThan(2.5);
      expect(card.radius).toBeLessThan(4);
    }
  });
});
