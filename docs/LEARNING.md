# Learning registry

One line per concept, linking to the note that explains it. New concepts
append; nothing is rewritten. The protocol that produces these notes is
[AGENTS.md](../AGENTS.md) §13.

## Format

```
- YYYY-MM-DD — <concept in kebab-case> — <one-sentence definition> — <link to note>
```

Each note lives in this repository only if it is a decision (an ADR under
`docs/adr/`). Learning notes themselves are kept in the Obsidian vault, per
AGENTS.md §13, so registry entries link to the vault note title
rather than to a file in this repo.

A note is only added here once the author can deliver the teach-back described
in AGENTS.md §13 step 3. Speed without that understanding does not count as
progress.

## Registry

- 2026-10-31 — `archive-data-model` — an export is seven entities (MediaFile,
  Post, Story, Person, Thread, Message, Event) joined by strings, not ids —
  vault: `architecture/2026-10-31_archive-data-model.md`
- 2026-10-31 — `mojibake-repair` — the export files are pure ASCII; the
  corruption is `\u`-escaped inside string values and is repaired by
  latin-1 → utf-8 on each string, in every category —
  vault: `mind-maps/2026-10-31_archive-relationships.md`
- 2026-10-31 — `normalised-by-omission` — the export records *who* an action
  involved but rarely *what* it was performed on (no post id, no story id, no
  collection membership —
  vault: `architecture/2026-10-31_archive-data-model.md`
- 2026-10-31 — `privacy-tiered-build-order` — categories are ordered by whose
  data they contain, so third-party messages and identities are built last —
  see `docs/DATA-MAP.md`
- 2026-10-31 — `mojibake` — corruption stored inside string values, not a file
  encoding; repaired by reinterpret-as-bytes → decode UTF-8, once, per string —
  vault: `learning-notes/concepts/mojibake.md`
- 2026-10-31 — `ports-and-adapters` — core depends on an interface, adapters
  implement it, so storage can be swapped without touching the core; no port
  without a second implementation —
  vault: `learning-notes/concepts/ports-and-adapters.md`
- 2026-10-31 — `define-errors-out-of-existence` — a job is a four-state union
  where `parsing` must carry `done`/`total`, and a persisted `parsing` recovers as
  `interrupted`; the stuck-spinner state cannot be written —
  vault: `debug-log/2026-10-31_stuck-parsing-state.md`
- 2026-10-31 — `ingestion-pipeline` — validate, then stream, then store in
  batches, committing the archive row last —
  vault: `architecture/2026-10-31_ingestion-pipeline.md`
- 2026-10-31 — `reference-driven-storage` — media is stored because a resolved
  reference points at it, not because its filename has a media extension; orphans
  are counted, missing references are counted, nothing is guessed from a suffix —
  vault: `debug-log/2026-10-31_thread-relative-media.md`
- 2026-10-31 — `three-state-media` — a media URL is `pending`, `ready` or
  `failed` with a reason; there is no null-as-loading, and a missing blob can
  never render as a spinner —
  vault: `architecture/2026-10-31_read-path.md`
- 2026-10-31 — `extract-on-the-third-caller` — the media tile/grid/detail layer
  moved out of the posts route only once stories and archived needed the same
  thing; two callers would have been a guess —
  vault: `architecture/2026-10-31_shared-media-layer.md`
- 2026-10-31 — `render-what-you-measured` — `/` shows 376 items because the archive
  measures 376 media references, not because posts were the only thing built —
  vault: `learning-notes/2026-10-31_session-05.md`
- 2026-10-31 — `drift-detection` — two exports of one product can disagree about a file's
  shape while agreeing about its name; comparing measured shapes is how you find out before a
  user does —
  vault: `architecture/2026-10-31_format-migration-drift.md`
- 2026-10-31 — `additive-tolerance` — a category needs one measured signature per format it
  has been seen in; a changed shape means *more* signatures, never a looser one —
  vault: `debug-log/2026-10-31_format-envelope-migration.md`
- 2026-10-31 — `unexercised-fallback` — a tier that never wins is not verified; test it
  where it is the only thing that can succeed —
  vault: `debug-log/2026-10-31_tier2-never-ran.md`
- 2026-10-31 — `signatures-per-format` — a category carries one signature per export format
  it has been measured in, and the tie-break is scored per signature, not per row —
  see `docs/adr/0008-multiple-signatures-per-category.md`
- 2026-10-31 — `drift-report-privacy` — a committed comparison document may carry ids,
  key names, counts and fingerprints, and nothing else; a test enforces the "nothing
  else" —
  vault: `architecture/2026-10-31_drift-tooling.md`
- 2026-10-31 — `measure-then-promote` — a newly seen file becomes a registry row through a
  measurement printed by the tool, never through a hand-written guess —
  vault: `learning-notes/2026-10-31_session-07.md`
- 2026-10-31 — `known-unknown` — a category can be resolved and stored verbatim while
  nothing about its values is interpreted, so it has no view and no route —
  vault: `learning-notes/2026-10-31_session-07.md`
- 2026-10-31 — `interpretation-in-core` — the archive's shapes are interpreted once in
  core where they are testable; the React components only decide which panel to show —
  vault: `architecture/2026-10-31_generic-renderer.md`
- 2026-10-31 — `additive-merge-with-provenance` — a category fed by several files keeps
  every file, sums the entries and records path/count/kind, because any fold of two
  objects has to drop a key —
  vault: `debug-log/2026-10-31_last-write-wins.md`
- 2026-10-31 — `bounded-cache-with-explicit-release` — an object URL is a leak and a bitmap
  is memory; one entry per path with LRU-by-count eviction that revokes then closes is the
  smallest design that is both fast and honest —
  vault: `architecture/2026-10-31_media-cache.md`
- 2026-10-31 — `gate-before-the-read` — a privacy gate that hides rendered data is weaker
  than one that never mounts the reader, so the repository call happens after the click —
  vault: `architecture/2026-10-31_media-cache.md`
- 2026-10-31 — `tokens-as-data` — one CSS file of custom properties; Tailwind, the DOM
  and any future canvas read the same values, and a gate refuses escapes —
  vault: `architecture/2026-10-31_design-system.md`
- 2026-10-31 — `contrast-fixes-the-token` — a failing contrast pair changes the token,
  never the threshold; two palette values moved because of measurement —
  vault: `architecture/2026-10-31_design-system.md`
- 2026-10-31 — `instanced-drawing` — one unit quad, per-instance offset/scale/layer/alpha,
  one draw call for every visible card; the loop belongs to the caller, not the renderer —
  vault: `architecture/2026-10-31_instanced-rendering.md`
- 2026-10-31 — `texture-array-vs-atlas` — a sampler2DArray gives every card a layer, so
  `vec3(uv, layer)` needs no padding, packing or re-packing; an atlas is the same memory
  with more arithmetic —
  vault: `architecture/2026-10-31_instanced-rendering.md`
- 2026-11-04 — `worker-ready-handshake` — messages posted to a worker before it
  installs its listener are lost, so a worker protocol needs an explicit ready ping —
  vault: `debug-log/2026-11-04_worker-ready-handshake.md`
- 2026-11-04 — `browser-before-green` — a green suite proves what its fakes model; the
  product is proven by driving a real browser against a real archive —
  vault: `learning-notes/2026-11-04_session-12.md`
- 2026-11-13 — `e2e-lane-tests-the-build` — a browser lane drives the built app through
  `vite preview`, never the dev server, because the faults worth catching live in the
  build; the dev routes require a development-mode build —
  vault: `architecture/2026-11-13_browser-lane.md`
- 2026-11-13 — `bitmap-close-zeroes-bytes` — `ImageBitmap.close()` destroys the
  dimensions, so byte accounting read after close reports 0; a fake that keeps them
  hides the bug —
  vault: `debug-log/2026-11-13_closed-bitmap-zero-bytes.md`
- 2026-11-13 — `top-level-await-loses-messages` — a module worker's event loop starts
  mid-load, so a message posted before its listener exists is dropped and the page waits
  forever —
  vault: `debug-log/2026-11-04_worker-ready-handshake.md`
- 2026-11-13 — `layout-is-a-function-of-phase` — a spiral built once at phase 0 and
  scrolled only by a texture window never moves; rebuild the layout per frame —
  vault: `learning-notes/2026-11-13_session-13.md`
- 2026-11-13 — `one-reducer-one-guard` — wheel, drag and tick all become velocity in one
  core reducer, and reduced motion is one guard there instead of three listeners each
  remembering it —
  vault: `mind-maps/2026-11-13_cyclone-interaction.md`
- 2026-11-13 — `sidebar-is-navigation` — the shell's navigation is a persistent sidebar:
  galleries, then five tier disclosures, each opening to its own page — not a table of 86
  rows —
  vault: `architecture/2026-11-13_sidebar-and-tiers.md`
- 2026-11-13 — `ribbon-not-cylinder` — the cyclone's width comes from the layout's x-extent,
  derived from the viewport aspect; the camera stays at 9 units and never moves —
  vault: `learning-notes/2026-11-13_session-14.md`
- 2026-11-13 — `video-poster-once` — a `<video>` paints nothing before a frame is decoded, so
  one poster is drawn on the main thread, stored under a `poster:` key and reused —
  vault: `learning-notes/2026-11-13_session-14.md`
- 2026-11-13 — `grid-columns-are-positions` — removing a grid item re-flows the rest; a
  closed sidebar must declare one column or the content lands in the zero-width one —
  vault: `debug-log/2026-11-13_closed-grid-column.md`
- 2026-11-13 — `fit-not-square` — resizing a bitmap to fit 256 keeps its ratio, and the shader
  samples only the used part of the layer; forcing 256x256 squashes every photo —
  vault: `learning-notes/2026-11-13_session-15.md`
- 2026-11-13 — `cache-hit-must-say-so` — a list hook that keeps the previous category's state
  shows stale content; one that always resets shows a spinner; the hit path must set state —
  vault: `learning-notes/2026-11-13_session-15.md`
- 2026-11-13 — `controls-above-canvas` — a control that floats over a full-bleed canvas needs
  its own stacking context, or the route swallows it —
  vault: `learning-notes/2026-11-13_session-15.md`
- 2026-11-13 — `bespoke-per-content` — two categories share a screen only when
  their measured content is the same shape; the screen is chosen by what the record
  contains, not by its name — see `docs/adr/0012-bespoke-per-content.md`
- 2026-11-13 — `settings-view-model` — the label/value envelope is interpreted once
  in core into labelled fields, nested sections, timestamps and absent values, so
  the view is a definition list and never touches archive keys —
  vault: `architecture/2026-11-13_bespoke-per-content.md`
- 2026-11-13 — `records-not-devices` — thirty entries with one repeated identifier
  and one repeated profile are thirty records of one device; counting rows would
  invent thirty devices —
  vault: `debug-log/2026-11-13_records-not-devices.md`
- 2026-11-13 — `counts-need-units` — a count without its unit is ambiguous; one
  formatter gives 1 entry / 2 entries / 1 media item / 2 media items, and a
  present-but-empty category shows no count rather than a bare zero —
  vault: `learning-notes/2026-11-13_session-16.md`
- 2026-11-13 — `absent-is-not-zero` — a zero timestamp is the export's "not set",
  not 1 January 1970; the raw number stays visible and the invented date does not —
  vault: `learning-notes/2026-11-13_session-16.md`
- 2026-11-13 — `fallback-is-the-proof` — a bespoke screen returns `null` when the
  record does not match its measured shape, so a changed export degrades to the
  table or tree instead of showing a confident lie —
  vault: `mind-maps/2026-11-13_t1-screen-groups.md`
