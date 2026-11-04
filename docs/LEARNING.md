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
