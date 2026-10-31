/**
 * M1 stub. The worker entry point lands with the parser pipeline (ADR 0002):
 * it runs `packages/core`, writes through `packages/storage`, and posts progress
 * back to the main thread.
 *
 * Nothing is implemented yet on purpose — an empty shell that pretends to parse
 * would be worse than no shell at all.
 */

export interface ParseProgress {
  readonly resolvedCategories: number;
  readonly totalCategories: number;
  readonly currentFile: string;
}
