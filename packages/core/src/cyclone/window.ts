/**
 * Which cards should hold a texture right now.
 *
 * The cyclone is a window over the sequence, never "all of them" (D2). A fixed
 * number of resident cards keeps GPU memory flat no matter how large the archive
 * is: 96 × 256² RGBA is ~25 MB. Advancing the window requests only the cards that
 * are newly entering, so scrolling is a trickle of uploads, not a rebuild.
 *
 * The window is centred on the focus index, so consecutive windows overlap by
 * roughly half — that overlap is what stops a card popping in empty at the seam.
 */

export const DEFAULT_WINDOW_SIZE = 96;

export function residentWindow(
  count: number,
  focusIndex: number,
  windowSize: number = DEFAULT_WINDOW_SIZE,
): readonly number[] {
  if (count <= 0) return [];
  if (windowSize >= count) return Array.from({ length: count }, (_, index) => index);

  const size = Math.max(1, Math.floor(windowSize));
  const centre = ((Math.floor(focusIndex) % count) + count) % count;
  const start = centre - Math.floor(size / 2);

  return Array.from({ length: size }, (_, offset) => (((start + offset) % count) + count) % count);
}
