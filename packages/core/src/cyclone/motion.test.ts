import { describe, expect, it } from "vitest";

import { advance } from "./motion.js";

describe("advance", () => {
  it("moves forward with positive velocity", () => {
    expect(advance(10, 100, 0.5)).toBe(60);
  });

  it("moves backwards with negative velocity", () => {
    expect(advance(10, 100, -0.5)).toBe(-40);
  });

  it("does nothing for a zero time step", () => {
    expect(advance(10, 0, 5)).toBe(10);
  });

  it("does not move at all under reduced motion, even with velocity", () => {
    expect(advance(10, 5000, 2, true)).toBe(10);
  });

  it("ignores a non-finite dt instead of producing NaN", () => {
    expect(advance(10, Number.NaN, 2)).toBe(10);
  });
});
