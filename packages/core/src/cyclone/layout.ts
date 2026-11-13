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

/** Vertical distance between adjacent cards, in world units. */
export const VERTICAL_SPACING = 1.5;

/** The camera never moves: 9 world units back, 60 degrees down the middle (D5). */
export const CAMERA_DISTANCE = 9;
export const FOV_Y = Math.PI / 3;

/** How much of the viewport's half-width the ribbon sweeps across. */
export const RIBBON_SPREAD_SHARE = 0.82;

/** Depth excursion: shallow and fixed, so nothing is ever behind the camera. */
export const RIBBON_DEPTH = 0.6;

/** A card's half-width as a share of the viewport width. */
export const CARD_SIZE_SHARE = 0.022;

/** The camera, as a value. Nothing about it depends on the viewport (D5). */
export function camera(): { readonly distance: number; readonly fovY: number } {
  return { distance: CAMERA_DISTANCE, fovY: FOV_Y };
}

/** World half-width the ribbon sweeps across, derived from the viewport's aspect. */
export function ribbonSpread(viewport: {
  readonly width: number;
  readonly height: number;
}): number {
  const aspect =
    viewport.width > 0 && viewport.height > 0 ? viewport.width / viewport.height : 16 / 9;
  return RIBBON_SPREAD_SHARE * CAMERA_DISTANCE * Math.tan(FOV_Y / 2) * aspect;
}

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

/**
 * The ribbon: cards drift down while sweeping left↔right across the viewport,
 * with a shallow, fixed depth excursion.
 *
 * The golden angle is the sweep parameter, not a spiral: two consecutive cards are
 * 137° apart, so neighbours never stack, and a full band of vertical travel is the
 * only thing that ever repeats. Width comes from `ribbonSpread` (the viewport's
 * aspect); the camera stays at 9 units whatever the window does (D5).
 *
 * `radius`/`angle` stay in the output because the projection speaks polar
 * coordinates; they now describe a point on a shallow ellipse rather than a ring.
 */
export function vortexLayout(
  count: number,
  phase: number,
  opts: {
    readonly cardAspect: number;
    readonly viewport?: { readonly width: number; readonly height: number };
  },
): readonly CardTransform[] {
  if (count <= 0) return [];

  const spread = ribbonSpread(opts.viewport ?? { width: 16, height: 9 });
  const totalHeight = count * VERTICAL_SPACING;
  const aspectBias = 1 / Math.max(opts.cardAspect, 0.25);
  const cards: CardTransform[] = [];

  for (let index = 0; index < count; index += 1) {
    const sweep = index * GOLDEN_ANGLE;
    // Wrap into a centred band so the ribbon stays in front of the camera instead
    // of drifting off to infinity as phase grows.
    const unwrapped = index * VERTICAL_SPACING - phase;
    const wrapped = ((unwrapped % totalHeight) + totalHeight) % totalHeight;
    const y = wrapped - totalHeight / 2;

    const x = spread * Math.sin(sweep);
    const z = RIBBON_DEPTH * Math.sin(sweep * 0.5);
    const radius = Math.max(1e-6, Math.hypot(x, z));
    const angle = Math.atan2(z, x);
    const depth = Math.cos(angle);

    cards.push({ index, angle, y, radius, depth, scale: (1 + 0.12 * depth) * aspectBias });
  }

  return cards;
}

/** One full turn of the spiral; advancing phase by this is a no-op visually. */
/**
 * The card currently nearest the camera.
 *
 * The layout wraps `index * VERTICAL_SPACING - phase` into a band of length
 * `count * VERTICAL_SPACING`, so the card crossing `y = 0` is the one whose
 * unwrapped position is half a band behind the top. Sizing the texture window
 * from `floor(phase)` instead — a world-unit number used as an index — put all 96
 * resident textures on cards hundreds of units below the frustum while the eight
 * cards on screen had none: a black canvas with 96 textures resident (M17).
 */
export function focusedIndex(count: number, phase: number): number {
  if (count <= 0) return 0;
  const total = totalHeightOf(count);
  const raw = Math.round((phase + total / 2) / VERTICAL_SPACING);
  return ((raw % count) + count) % count;
}

export function totalHeightOf(count: number): number {
  return Math.max(0, count) * VERTICAL_SPACING;
}
