# 0010 — A windowed texture array for the cyclone

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** project owner
- **Relates to:** ADR 0004 (Vite), ADR 0009, AGENTS §7

## Context

The cyclone shows an archive's media as cards on a spiral. `archive-2/` has 405
media items; a real export can have thousands. Two questions had to be answered
before a line of GL was written: how many cards are resident, and how are their
pixels addressed.

## Options considered

1. **One texture per card, all of them.** Simple, and grows without bound: 405
   cards at 512² RGBA is ~425 MB of GPU memory. Rejected.
2. **An atlas of thumbnails.** One texture, cards addressed by UV offsets. Saves
   the array extension, but needs padding to stop bleeding between neighbours, a
   packing algorithm, and a full re-pack whenever the visible set changes.
3. **A `sampler2DArray` with a fixed 96-layer window.** One texture object, one
   layer per resident card, `texture(uAtlas, vec3(uv, layer))` in the shader.
   Chosen.

## Decision

- **96 resident cards** (`DEFAULT_WINDOW_SIZE`), 256² RGBA each: **96 × 256² × 4 ≈
  25 MB** of texture memory, independent of archive size. The window is centred on
  the focus index and wraps, so consecutive windows overlap and scrolling does not
  flash an empty card.
- **256px, not the grid's 512px.** A card on screen is a couple of hundred pixels
  at most; 512 would quadruple memory for no visible gain. Cyclone bitmaps are
  produced with `createImageBitmap(..., { resizeWidth: 256 })` from the stored
  blob, separately from the grid's thumbnail store.
- **One draw call.** Per-instance attributes carry offset, scale, layer and alpha;
  the geometry is one unit quad. 96 cards, 1 draw call.
- **The budget is enforced, not monitored.** Allocation has one failure mode — a
  thrown error — and one free list. There is no "grow in production, throw in
  tests" branch, because a branch only tests exercise is not a test.

## Consequences

- **What breaks first on a weak GPU** is `MAX_ARRAY_TEXTURE_LAYERS` (< 96) or a
  driver that refuses a 96-layer RGBA8 array. Both are detected at context
  creation, and the route falls back to the grid with a sentence saying why.
- **Texture upload is a trickle.** Entering cards request a bitmap each; leaving
  cards free a layer immediately. Scrolling is uploads, never a re-pack.
- **A card without a resident texture is skipped** for a frame or two rather than
  drawn as a black square. That is a deliberate pop-in trade against a flash.
- **No atlas maths**, so the shader is one line and there is no bleeding class of
  bug to debug.
- **The window size is a constant, not a setting.** Raising it raises memory
  linearly; changing it means revisiting this ADR and the 25 MB claim.
