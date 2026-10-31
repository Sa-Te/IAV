import type { ScreenCard } from "./projection.js";

/**
 * Which card is under (or near) the pointer.
 *
 * "Near" matters: a 4px-wide card at depth is impossible to hit exactly, so the
 * caller passes a generous maxRadiusPx. Ties are broken by depth — the card nearer
 * the camera wins — because that is the one the eye thinks is on top.
 */
export function pickNearest(
  cards: readonly ScreenCard[],
  pointer: { readonly x: number; readonly y: number },
  maxRadiusPx: number,
): number | null {
  let best: ScreenCard | null = null;
  let bestDistance = Infinity;

  for (const card of cards) {
    if (!card.visible) continue;
    const dx = card.x - pointer.x;
    const dy = card.y - pointer.y;
    const distance = Math.hypot(dx, dy);
    if (distance > maxRadiusPx) continue;

    if (
      best === null ||
      distance < bestDistance ||
      (distance === bestDistance && card.depth > best.depth)
    ) {
      best = card;
      bestDistance = distance;
    }
  }

  return best === null ? null : best.index;
}
