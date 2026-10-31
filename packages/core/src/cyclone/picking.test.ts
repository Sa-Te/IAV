import { describe, expect, it } from "vitest";

import { pickNearest } from "./picking.js";
import type { ScreenCard } from "./projection.js";

function screen(overrides: Partial<ScreenCard> = {}): ScreenCard {
  return { index: 0, x: 100, y: 100, depth: 5, visible: true, ...overrides };
}

describe("pickNearest", () => {
  it("returns the card under the pointer", () => {
    const cards = [screen({ index: 7, x: 200, y: 120 })];

    expect(pickNearest(cards, { x: 203, y: 118 }, 24)).toBe(7);
  });

  it("returns null beyond the radius", () => {
    expect(pickNearest([screen()], { x: 400, y: 400 }, 30)).toBeNull();
  });

  it("ignores cards that are not visible", () => {
    expect(pickNearest([screen({ visible: false })], { x: 100, y: 100 }, 30)).toBeNull();
  });

  it("resolves overlapping cards to the nearer one", () => {
    const near = screen({ index: 1, depth: 9 });
    const far = screen({ index: 2, depth: 2 });

    expect(pickNearest([far, near], { x: 100, y: 100 }, 30)).toBe(1);
  });

  it("prefers the closer card only when the pointer distance ties", () => {
    const closer = screen({ index: 1, x: 110, depth: 9 });
    const exact = screen({ index: 2, x: 100, depth: 2 });

    expect(pickNearest([closer, exact], { x: 100, y: 100 }, 30)).toBe(2);
  });

  it("returns null for an empty field", () => {
    expect(pickNearest([], { x: 0, y: 0 }, 100)).toBeNull();
  });
});
