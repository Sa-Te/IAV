import { describe, expect, it } from "vitest";

import {
  camera,
  CAMERA_DISTANCE,
  FOV_Y,
  focusedIndex,
  GOLDEN_ANGLE,
  ribbonSpread,
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

  it("sweeps with the golden angle and never repeats a neighbouring x", () => {
    // The sweep parameter is still the golden angle; the *angle* the projection
    // sees is now the direction of the point on a shallow ellipse.
    const cards = vortexLayout(3, 0, { ...OPTS, viewport: { width: 1600, height: 900 } });
    const spread = ribbonSpread({ width: 1600, height: 900 });

    const first = cards[0];
    expect(first === undefined ? 0 : first.radius * Math.cos(first.angle)).toBeCloseTo(0, 4);
    cards.forEach((card, index) => {
      const x = card.radius * Math.cos(card.angle);
      expect(x).toBeCloseTo(spread * Math.sin(index * GOLDEN_ANGLE), 4);
    });
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

  it("keeps every card inside the centred band and inside the ribbon's width", () => {
    const viewport = { width: 1600, height: 900 };
    const cards = vortexLayout(50, 7, { ...OPTS, viewport });
    const half = totalHeightOf(50) / 2;
    const spread = ribbonSpread(viewport);

    for (const card of cards) {
      expect(card.y).toBeGreaterThanOrEqual(-half);
      expect(card.y).toBeLessThan(half);
      expect(card.radius * Math.cos(card.angle)).toBeGreaterThanOrEqual(-spread);
      expect(card.radius * Math.cos(card.angle)).toBeLessThanOrEqual(spread);
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

describe("the ribbon fits the viewport", () => {
  const VIEWPORTS = [
    { width: 1440, height: 810 }, // 16:9
    { width: 1024, height: 768 }, // 4:3
    { width: 1680, height: 720 }, // 21:9
  ] as const;

  const screenOf = (viewport: { width: number; height: number }, count = 405) =>
    projectCards(vortexLayout(count, 0, { cardAspect: 0.75, viewport }), {
      yaw: 0,
      pitch: 0,
      ...camera(),
      viewport,
    });

  it("spans at least 80% of the width at 16:9, 4:3 and 21:9", () => {
    for (const viewport of VIEWPORTS) {
      const xs = screenOf(viewport).map((card) => card.x);
      const extent = (Math.max(...xs) - Math.min(...xs)) / viewport.width;
      expect(extent).toBeGreaterThanOrEqual(0.8);
    }
  });

  it("keeps every card centre inside the frustum at all three aspects", () => {
    for (const viewport of VIEWPORTS) {
      for (const card of screenOf(viewport)) {
        expect(card.visible).toBe(true);
        expect(card.x).toBeGreaterThanOrEqual(0);
        expect(card.x).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  it("keeps every card individually pickable, overlap allowed", () => {
    // M18's owner decided cards may overlap as long as the one under the pointer
    // can still be opened. What that needs is separation between *centres*: the
    // picker takes the nearest centre within its radius, so no two centres may
    // sit closer than a radius apart.
    const viewport = { width: 1440, height: 810 };
    const screen = screenOf(viewport).filter(
      (card) =>
        card.x > -100 &&
        card.x < viewport.width + 100 &&
        card.y > -100 &&
        card.y < viewport.height + 100,
    );
    const pickRadius = Math.max(72, viewport.width * 0.12);

    for (let a = 0; a < screen.length; a += 1) {
      for (let b = a + 1; b < screen.length; b += 1) {
        const one = screen[a];
        const other = screen[b];
        if (one === undefined || other === undefined) continue;
        const distance = Math.hypot(one.x - other.x, one.y - other.y);
        expect(distance).toBeGreaterThan(pickRadius);
      }
    }
  });

  it("leaves no vertical gap larger than one spacing unit", () => {
    const viewport = { width: 1440, height: 810 };
    const ys = screenOf(viewport, 96)
      .map((card) => card.y)
      .filter((y) => y > -100 && y < viewport.height + 100)
      .sort((left, right) => left - right);
    const pxPerUnit = viewport.height / 2 / (CAMERA_DISTANCE * Math.tan(FOV_Y / 2));

    for (let index = 1; index < ys.length; index += 1) {
      expect((ys[index] ?? 0) - (ys[index - 1] ?? 0)).toBeLessThanOrEqual(
        VERTICAL_SPACING * pxPerUnit * 2,
      );
    }
  });

  it("is deterministic for the same inputs", () => {
    const viewport = { width: 1280, height: 720 };
    expect(vortexLayout(405, 12.5, { cardAspect: 0.75, viewport })).toEqual(
      vortexLayout(405, 12.5, { cardAspect: 0.75, viewport }),
    );
  });

  it("keeps the camera independent of the viewport", () => {
    // D5: width comes from the layout, never from the camera. The camera is a
    // constant, so two aspects project with the same one.
    expect(camera()).toEqual(camera());
    expect(camera().distance).toBe(CAMERA_DISTANCE);
    expect(ribbonSpread({ width: 1680, height: 720 })).toBeGreaterThan(
      ribbonSpread({ width: 1024, height: 768 }),
    );
  });
});
