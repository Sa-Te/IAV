import { describe, expect, it } from "vitest";

import {
  advance,
  easeTilt,
  IDLE_VELOCITY,
  MAX_SPIN,
  NO_TILT,
  reducePhase,
  stillPhase,
  TILT_LIMIT,
  tiltTarget,
  type PhaseState,
  type Tilt,
} from "./motion.js";

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

/** Runs frames until `ms` has passed at 16 ms a frame. */
function run(state: PhaseState, ms: number): PhaseState {
  let next = state;
  for (let elapsed = 0; elapsed < ms; elapsed += 16) {
    next = reducePhase(next, { type: "tick", dtMs: 16 });
  }
  return next;
}

describe("wheel", () => {
  it("turns a deltaY into a bounded spin", () => {
    const once = reducePhase(stillPhase(), { type: "wheel", deltaY: 100 });

    expect(once.spin).toBeGreaterThan(0);
    // A single hard flick cannot exceed the clamp.
    const hard = reducePhase(stillPhase(), { type: "wheel", deltaY: 100_000 });
    expect(hard.spin).toBe(MAX_SPIN);
  });

  it("moves the phase forward by idle plus spin, not by the delta itself", () => {
    const state = reducePhase(stillPhase(), { type: "wheel", deltaY: 1000 });
    const next = reducePhase(state, { type: "tick", dtMs: 100 });

    expect(next.phase).toBeGreaterThan(0);
    expect(next.phase).toBeLessThan((IDLE_VELOCITY + MAX_SPIN) * 100 + 1e-9);
  });

  it("scrolls backwards for a negative deltaY", () => {
    const state = reducePhase(stillPhase(), { type: "wheel", deltaY: -400 });
    expect(reducePhase(state, { type: "tick", dtMs: 100 }).phase).toBeLessThan(0);
  });
});

describe("drag", () => {
  it("follows the pointer by exactly the dragged distance", () => {
    const next = reducePhase(stillPhase(), { type: "drag", deltaPhase: 2.5, dtMs: 16 });

    expect(next.phase).toBeCloseTo(2.5, 10);
  });

  it("carries the release velocity and decays it to zero in under three seconds", () => {
    const released = reducePhase(stillPhase(), { type: "drag", deltaPhase: 3, dtMs: 16 });
    const after = run(released, 3000);

    expect(Math.abs(released.spin)).toBeGreaterThan(0);
    expect(Math.abs(after.spin)).toBeLessThan(Math.abs(released.spin) / 1000);
  });

  it("never carries more than the spin ceiling", () => {
    const flicked = reducePhase(stillPhase(), { type: "drag", deltaPhase: 500, dtMs: 1 });
    expect(flicked.spin).toBe(MAX_SPIN);
  });
});

describe("reduced motion", () => {
  const start: PhaseState = { phase: 12, spin: 0.002 };

  it("ignores a wheel", () => {
    expect(reducePhase(start, { type: "wheel", deltaY: 500 }, true)).toEqual(start);
  });

  it("ignores a drag", () => {
    expect(reducePhase(start, { type: "drag", deltaPhase: 4, dtMs: 16 }, true)).toEqual(start);
  });

  it("ignores a tick, so the phase never creeps", () => {
    expect(reducePhase(start, { type: "tick", dtMs: 1000 }, true)).toEqual(start);
  });

  it("ignores a tilt, and the column does not lean", () => {
    const leaning: Tilt = { yaw: 0.1, pitch: -0.05 };
    expect(tiltTarget(0, 0, 800, 600)).toEqual({ yaw: -TILT_LIMIT, pitch: -TILT_LIMIT });
    expect(easeTilt(leaning, { yaw: TILT_LIMIT, pitch: TILT_LIMIT }, 16, true)).toEqual(NO_TILT);
  });
});

describe("tilt", () => {
  it("clamps at its limit however far the pointer goes", () => {
    for (const [x, y] of [
      [-5000, -5000],
      [0, 0],
      [9999, 9999],
    ] as const) {
      const tilt = tiltTarget(x, y, 800, 600);
      expect(Math.abs(tilt.yaw)).toBeLessThanOrEqual(TILT_LIMIT);
      expect(Math.abs(tilt.pitch)).toBeLessThanOrEqual(TILT_LIMIT);
    }
    expect(tiltTarget(9999, 0, 800, 600).yaw).toBe(TILT_LIMIT);
  });

  it("is level at the centre of the canvas", () => {
    expect(tiltTarget(400, 300, 800, 600)).toEqual({ yaw: 0, pitch: 0 });
  });

  it("has nothing to lean on when the canvas has no size", () => {
    expect(tiltTarget(10, 10, 0, 0)).toEqual(NO_TILT);
  });

  it("eases toward the target without overshooting it", () => {
    const target = { yaw: TILT_LIMIT, pitch: 0 };
    const first = easeTilt(NO_TILT, target, 16);
    const second = easeTilt(first, target, 16);

    expect(first.yaw).toBeGreaterThan(0);
    expect(first.yaw).toBeLessThan(target.yaw);
    expect(second.yaw).toBeGreaterThan(first.yaw);
    expect(second.yaw).toBeLessThan(target.yaw);
  });

  it("does not move in a zero-length frame", () => {
    const current = { yaw: 0.05, pitch: 0.02 };
    expect(easeTilt(current, NO_TILT, 0)).toEqual(current);
  });
});
