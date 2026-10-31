/**
 * Scroll and idle motion, as arithmetic.
 *
 * No clock: `dt` and `velocity` come from the caller, so a test can advance a
 * minute in a microsecond and a paused tab simply passes dt = 0. Reduced motion is
 * not "slow motion" — the phase does not move at all.
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
