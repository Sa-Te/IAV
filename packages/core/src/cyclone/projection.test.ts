import { describe, expect, it } from "vitest";

import type { CardTransform } from "./layout.js";
import { projectCards, type Camera } from "./projection.js";

const CAMERA: Camera = {
  yaw: 0,
  pitch: 0,
  distance: 8,
  fovY: Math.PI / 4,
  viewport: { width: 1200, height: 800 },
};

function card(overrides: Partial<CardTransform> = {}): CardTransform {
  return { index: 0, angle: 0, y: 0, radius: 0, scale: 1, depth: 1, ...overrides };
}

describe("projectCards", () => {
  it("projects a card on the camera's axis to the viewport centre", () => {
    const [screen] = projectCards([card()], CAMERA);

    expect(screen?.visible).toBe(true);
    expect(screen?.x).toBeCloseTo(600, 6);
    expect(screen?.y).toBeCloseTo(400, 6);
    expect(screen?.depth).toBeCloseTo(8, 6);
  });

  it("hides a card behind the camera", () => {
    // radius 20 at angle π/2 puts the card at z = +20, behind a camera at z = 8.
    const [screen] = projectCards([card({ angle: Math.PI / 2, radius: 20 })], CAMERA);

    expect(screen?.visible).toBe(false);
  });

  it("maps world-up to screen-up, so y grows downward like the DOM", () => {
    const [high, low] = projectCards([card({ index: 0, y: 2 }), card({ index: 1, y: -2 })], CAMERA);

    expect(high?.y).toBeLessThan(low?.y ?? 0);
  });

  it("moves the view when the camera yaws", () => {
    const cards = [card({ angle: Math.PI / 2, radius: 3 })];
    const straight = projectCards(cards, CAMERA);
    const turned = projectCards(cards, { ...CAMERA, yaw: Math.PI / 2 });

    expect(straight[0]?.x).not.toBeCloseTo(turned[0]?.x ?? 0, 2);
  });

  it("returns one entry per input card, visible or not", () => {
    expect(
      projectCards(
        [card(), card({ angle: Math.PI }), card({ angle: Math.PI / 2, radius: 20 })],
        CAMERA,
      ),
    ).toHaveLength(3);
  });
});
