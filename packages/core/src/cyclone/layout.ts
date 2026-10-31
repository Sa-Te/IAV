/**
 * The vortex, as arithmetic.
 *
 * A cyclone is a spiral: each card turns by the golden angle and climbs a fixed
 * step, so no two cards share an x position and the column never looks like a
 * stack of rings. `phase` scrolls the whole thing; the vertical coordinate wraps
 * modulo one full turn of the spiral, which is what makes the scroll endless with
 * no seam and no growing array.
 *
 * Pure and deterministic: the same count/phase/aspect always produce the same
 * cards. No clock, no randomness, no DOM.
 */

/** 2.399963… rad. Chosen because it never repeats a direction, so no two cards align. */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Vertical distance between adjacent cards, in card-heights-ish world units. */
export const VERTICAL_SPACING = 1.55;

/** Base orbit radius. Small enough that the column reads as a vortex, not a wall. */
export const BASE_RADIUS = 3.4;

/**
 * How much the radius breathes with the angle. Small on purpose: too much and the
 * ring looks like a wobble; this much makes the near side stand out from the far.
 */
export const RADIUS_BREATH = 0.18;

export interface CardTransform {
  readonly index: number;
  /** Radians. */
  readonly angle: number;
  /** World units, up-positive. Wrapped into [-height/2, height/2). */
  readonly y: number;
  readonly radius: number;
  readonly scale: number;
  /** cos(angle): +1 facing the camera, -1 behind the column. */
  readonly depth: number;
}

export function vortexLayout(
  count: number,
  phase: number,
  opts: { readonly cardAspect: number },
): readonly CardTransform[] {
  if (count <= 0) return [];

  const totalHeight = count * VERTICAL_SPACING;
  const cards: CardTransform[] = [];

  for (let index = 0; index < count; index += 1) {
    const angle = index * GOLDEN_ANGLE;
    // Wrap into a centred band so the column stays in front of the camera instead
    // of drifting off to infinity as phase grows.
    const unwrapped = index * VERTICAL_SPACING - phase;
    const wrapped = ((unwrapped % totalHeight) + totalHeight) % totalHeight;
    const y = wrapped - totalHeight / 2;

    const radius = BASE_RADIUS + RADIUS_BREATH * Math.sin(angle * 2);
    const depth = Math.cos(angle);

    // The card aspect is a hint for how much the far side shrinks visually; the
    // projection does the real work, this keeps a tall card from dominating.
    const aspectBias = 1 / Math.max(opts.cardAspect, 0.25);
    cards.push({
      index,
      angle,
      y,
      radius,
      depth,
      scale: (1 + 0.12 * depth) * aspectBias,
    });
  }

  return cards;
}

/** One full turn of the spiral; advancing phase by this is a no-op visually. */
export function totalHeightOf(count: number): number {
  return Math.max(0, count) * VERTICAL_SPACING;
}
