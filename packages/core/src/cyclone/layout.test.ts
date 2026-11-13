import { describe, expect, it } from "vitest";

import {
  focusedIndex,
  GOLDEN_ANGLE,
  totalHeightOf,
  vortexLayout,
  VERTICAL_SPACING,
} from "./layout.js";
import { projectCards } from "./projection.js";
import { residentWindow } from "./window.js";

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

describe("focusedIndex", () => {
  it("names the card the camera is looking at, not a world-unit number", () => {
    const height = 614;
    for (const count of [16, 96, 392]) {
      for (const phase of [0, 1.55, 17, 300, -4.2]) {
        const layout = vortexLayout(count, phase, { cardAspect: 0.75 });
        const screen = projectCards(layout, {
          yaw: 0,
          pitch: 0,
          distance: 9,
          fovY: Math.PI / 3,
          viewport: { width: 1104, height },
        });
        const focus = focusedIndex(count, phase);
        const card = screen.find((entry) => entry.index === focus);
        // Within one card's height of the vertical centre — and inside the window.
        expect(Math.abs((card?.y ?? Number.POSITIVE_INFINITY) - height / 2)).toBeLessThan(
          height / 2,
        );
        expect(residentWindow(count, focus, Math.min(96, count))).toContain(focus);
      }
    }
  });

  it("has nothing to focus in an empty archive", () => {
    expect(focusedIndex(0, 12)).toBe(0);
  });

  it("walks to the next card when the phase advances by one step", () => {
    expect(focusedIndex(392, 0)).toBe(196);
    expect(focusedIndex(392, VERTICAL_SPACING)).toBe(197);
  });
});
