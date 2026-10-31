import { describe, expect, it } from "vitest";

import { DEFAULT_WINDOW_SIZE, residentWindow } from "./window.js";

describe("residentWindow", () => {
  it("defaults to the documented 96-card budget", () => {
    expect(DEFAULT_WINDOW_SIZE).toBe(96);
  });

  it("returns 96 distinct indices over a 405-card sequence", () => {
    const window = residentWindow(405, 100);
    const unique = new Set(window);

    expect(window).toHaveLength(96);
    expect(unique.size).toBe(96);
    expect([...unique].every((index) => index >= 0 && index < 405)).toBe(true);
  });

  it("wraps at both ends", () => {
    expect(residentWindow(405, 0)).toContain(404);
    expect(residentWindow(405, 404)).toContain(0);
  });

  it("returns the whole sequence when the budget is larger than the count", () => {
    expect(residentWindow(5, 2, 96)).toEqual([0, 1, 2, 3, 4]);
  });

  it("is centred on the focus, so consecutive windows overlap", () => {
    const first = new Set(residentWindow(405, 100));
    const second = new Set(residentWindow(405, 150));
    const shared = [...second].filter((index) => first.has(index));

    expect(shared.length).toBeGreaterThan(0);
  });

  it("returns nothing for an empty sequence", () => {
    expect(residentWindow(0, 0)).toEqual([]);
  });
});
