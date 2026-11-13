/**
 * Scroll, drag, wheel and tilt, as arithmetic.
 *
 * No clock: `dt` and `velocity` come from the caller, so a test can advance a
 * minute in a microsecond and a paused tab simply passes dt = 0. Reduced motion is
 * not "slow motion" — the phase does not move at all.
 *
 * `advance` is the only place a phase changes. Everything below is a reducer that
 * decides *what velocity to hand it*; a second physics path in the renderer would
 * be a second place for reduced motion to be forgotten.
 *
 * Units: phase is world units (cards sit `VERTICAL_SPACING` apart), velocity is
 * phase units per millisecond, tilt is radians.
 */

export function advance(
  phase: number,
  dtMs: number,
  velocity: number,
  reducedMotion = false,
): number {
  if (reducedMotion) return phase;
  if (!Number.isFinite(dtMs) || dtMs === 0) return phase;
  return phase + velocity * dtMs;
}

/** Idle rotation: about a third of a world unit per second (slow enough to read). */
export const IDLE_VELOCITY = 0.35 / 1000;

/** A wheel tick or a flick cannot spin the vortex faster than this (~2.6 cards/s). */
export const MAX_SPIN = 4 / 1000;

/** Inertia halves every 300 ms: below a thousandth of the flick within 3 s. */
export const SPIN_HALF_LIFE_MS = 300;

/** One pixel of wheel deltaY is a tiny nudge, not a jump. */
export const WHEEL_GAIN = 0.00002;

/** Dragging 120 px moves the sequence by one card, the same step the arrows use. */
export const PHASE_PER_PIXEL = 1.55 / 120;

/** The vortex leans by at most this much: a lean, not an orbit. */
export const TILT_LIMIT = 0.16;

/** Time constant of the tilt ease; a jittery pointer must not jitter the column. */
export const TILT_EASE_MS = 120;

export interface PhaseState {
  readonly phase: number;
  /** Velocity the user gave it (wheel or drag), in phase units per ms. */
  readonly spin: number;
}

export interface Tilt {
  readonly yaw: number;
  readonly pitch: number;
}

export type PhaseEvent =
  /** One animation frame: the spin decays and the phase advances by idle + spin. */
  | { readonly type: "tick"; readonly dtMs: number }
  /** deltaY in pixels, positive = forward. */
  | { readonly type: "wheel"; readonly deltaY: number }
  /** The pointer moved `deltaPhase` since the previous move, `dtMs` ago. */
  | { readonly type: "drag"; readonly deltaPhase: number; readonly dtMs: number };

export const NO_TILT: Tilt = { yaw: 0, pitch: 0 };

export function stillPhase(): PhaseState {
  return { phase: 0, spin: 0 };
}

function clamp(value: number, limit: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-limit, Math.min(limit, value));
}

function decay(spin: number, dtMs: number): number {
  if (!Number.isFinite(dtMs) || dtMs <= 0) return spin;
  return spin * Math.pow(0.5, dtMs / SPIN_HALF_LIFE_MS);
}

/**
 * One event, one new state. Reduced motion is checked here rather than in the
 * view, so no caller can forget it.
 */
export function reducePhase(
  state: PhaseState,
  event: PhaseEvent,
  reducedMotion = false,
): PhaseState {
  if (reducedMotion) return state;

  switch (event.type) {
    case "tick": {
      const spin = decay(state.spin, event.dtMs);
      return {
        phase: advance(state.phase, event.dtMs, IDLE_VELOCITY + spin),
        spin,
      };
    }
    case "wheel": {
      return { ...state, spin: clamp(state.spin + event.deltaY * WHEEL_GAIN, MAX_SPIN) };
    }
    case "drag": {
      // The phase follows the pointer exactly, however fast it moves; the clamp
      // only limits the velocity carried after release, so a violent flick cannot
      // send the column spinning.
      const speed = event.deltaPhase / Math.max(event.dtMs, 1);
      return {
        phase: advance(state.phase, event.dtMs, speed),
        spin: clamp(speed, MAX_SPIN),
      };
    }
  }
}

/** Pointer position inside the canvas → a small, clamped lean. */
export function tiltTarget(x: number, y: number, width: number, height: number): Tilt {
  if (!(width > 0) || !(height > 0)) return NO_TILT;
  return {
    yaw: clamp((x / width) * 2 - 1, 1) * TILT_LIMIT,
    pitch: clamp((y / height) * 2 - 1, 1) * TILT_LIMIT,
  };
}

/** Exponential ease: always toward the target, never past it. */
export function easeTilt(current: Tilt, target: Tilt, dtMs: number, reducedMotion = false): Tilt {
  if (reducedMotion) return NO_TILT;
  if (!Number.isFinite(dtMs) || dtMs <= 0) return current;
  const k = 1 - Math.exp(-dtMs / TILT_EASE_MS);
  return {
    yaw: current.yaw + (target.yaw - current.yaw) * k,
    pitch: current.pitch + (target.pitch - current.pitch) * k,
  };
}
