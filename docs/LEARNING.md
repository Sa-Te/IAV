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
- 2026-10-31 — `tokens-as-data` — one CSS file of custom properties; the DOM,
  hand-written classes and any future canvas read the same values, and a gate
  refuses escapes —
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
  not 1 January 1970; the screen says "Not set", and the raw number stays in the
  hover title and the raw JSON —
  vault: `learning-notes/2026-11-13_session-16.md`
- 2026-11-13 — `fallback-is-the-proof` — a bespoke screen returns `null` when the
  record does not match its measured shape, so a changed export degrades to the
  table or tree instead of showing a confident lie —
  vault: `mind-maps/2026-11-13_t1-screen-groups.md`
- 2026-11-13 — `signed-urls-expire` — a CDN URL in an export is a signed
  capability with an `oe` expiry, not a file; an expired signature cannot be
  recomputed locally, so the honest UI shows the URL as text with its expiry —
  vault: `debug-log/2026-11-13_expired-avatar-urls.md`
- 2026-11-13 — `month-is-the-fold` — a 7,849-row list is a DOM problem, not a
  rendering problem; group by month, open the newest, show seven days and 200 rows
  at a time —
  vault: `learning-notes/concepts/event-list-grouping.md`
- 2026-11-13 — `hero-from-the-export` — the hero is the first non-empty measured
  caption-like label (`Caption`, `Title`, `Name`, `Search`, `Changed`,
  `Activation Type`); a category with none gets the plain field list, not an
  invented title — vault: `architecture/2026-11-13_event-list-grouping.md`
- 2026-11-13 — `timestamp-inside-string-map` — `{value: "", timestamp: 1786001771}`
  is a date, not an empty string; the envelope reader must prefer the timestamp
  when the value is empty —
  vault: `debug-log/2026-11-13_stories-viewed-dom.md`
- 2026-11-13 — `one-photo-is-still-media` — `personal_information`'s profile photo
  is a root-relative local blob and goes through the same three-state media layer
  as every other image; it is not a remote URL —
  vault: `learning-notes/2026-11-13_session-17.md`
- 2026-11-13 — `name-list-not-event-list` — a `vec` of names or places is a
  paginated list, not an event; it has no date and no hero —
  vault: `mind-maps/2026-11-13_t2-screens.md`
- 2026-11-13 — `graph-before-grep` — query the local graph before a name search;
  an EXTRACTED edge is a map, an INFERRED edge is still an INFERENCE under §15 —
  vault: `learning-notes/concepts/graph-before-grep.md`
- 2026-11-13 — `graph-code-only` — the graph is built with `--code-only` and
  `.graphifyignore`; the three privacy greps must be zero before it is trusted —
  vault: `architecture/2026-11-13_local-code-graph.md`
- 2026-11-13 — `t2-content-groups` — the 24 present T2 categories are 16 dated
  event lists, 2 settings pages, 2 location field lists, 3 name/place lists and
  1 profile with a local photo; the screen follows the measured content —
  vault: `architecture/2026-11-13_t2-content-groups.md`
- 2026-11-13 — `gate-is-not-the-tier` — the reveal gate answers "must the screen
  ask first" and the privacy tier answers "whose data is this"; comments are T3 and
  gated at once, so the registry carries a `gated` flag beside the tier —
  vault: `learning-notes/concepts/gate-is-not-the-tier.md`
- 2026-11-13 — `content-identity-dedupe` — a merge needs a definition of when two
  records are the same record; `posts.json` contains all 51 media URIs of
  `posts_1.json`, so a URI is one post and the raw 129 is not the screen's 78 —
  vault: `learning-notes/concepts/content-identity-dedupe.md`
- 2026-11-13 — `signature-says-what-it-is-not` — a structural signature needs
  `absentKeys` when a weaker shape would match an unrelated file;
  `note_and_repost_interactions.json` was folded into posts for fourteen
  milestones because `{media}` was too generous —
  vault: `debug-log/2026-11-13_posts-merged-three-files.md`
- 2026-11-13 — `fold-follows-the-span` — 7,849 entries in one month need a day cap;
  42,197 across 137 months need a year fold above the months; the fold follows the
  axis the data spans, not the entry count —
  vault: `mind-maps/2026-11-13_t3-screens.md`
- 2026-11-13 — `t3-content-groups` — the 18 present T3 categories are 11 dated
  event lists, 3 comment lists (same screen, gated) and 4 media galleries; no T3
  category needed a new screen —
  vault: `architecture/2026-11-13_t3-content-groups.md`
- 2026-11-13 — `apply-presentation-values` — a colour and a font size the export
  stored are values to apply, not text to print; the sticker/poll preview replaces
  "Background colour: #FFFFFF" with the colour itself (ADR 0016) —
  vault: `architecture/2026-11-13_presentation-values.md`
- 2026-11-13 — `membership-is-nesting` — Q18's "no link" was a measurement of the
  wrong thing: collections embed their saved posts as records, not as ids; URL is
  the identity between the two files (ADR 0017) —
  vault: `debug-log/2026-11-13_q18-membership-in-the-nesting.md`
- 2026-11-14 — `one-card-for-the-tier` — T4's twelve person rows differ in entry
  shape but not in the five concepts a card shows, so one measured mapper and one
  card serve the whole tier —
  vault: `architecture/2026-11-14_t4-person-screen.md`
- 2026-11-14 — `no-avatar-is-honest` — the export has no profile images; initials on
  a token surface are the honest card, not a generated picture, a hotlink or a
  hash-to-colour —
  vault: `learning-notes/concepts/no-avatar-is-honest.md`
- 2026-11-14 — `shared-filename-two-apps` — one basename written by two apps is two
  lists; measure the overlap, then key on the parent folder (0 of 29 shared) and
  split the registry row (ADR 0018) —
  vault: `debug-log/2026-11-14_follow-requests-collision.md`
- 2026-11-14 — `export-url-or-nothing` — a label called `URL` is not necessarily a
  profile URL; link only what the export marks as the person's profile, and show no
  link otherwise (ADR 0019) —
  vault: `architecture/2026-11-14_t4-person-screen.md`
- 2026-11-14 — `gate-the-contact-list` — followers are the reader's public network;
  an address book is people who did not choose this app. Gate the contacts, not the
  tier (ADR 0019) —
  vault: `learning-notes/concepts/gate-the-contact-list.md`
- 2026-11-14 — `re-measure-before-believing-a-projection` — the T3 projection called
  following/followers/hashtags undated; every entry carries a
  `string_list_data` timestamp, so the year fold engages and the projection was
  wrong —
  vault: `debug-log/2026-11-14_follow-requests-collision.md`
- 2026-11-14 — `dom-under-the-budget` — 200 person cards plus four year headings are
  1,620 DOM nodes, under the 2,000 threshold, so the list renders rather than
  virtualises; a budget test holds the ceiling —
  vault: `mind-maps/2026-11-14_t4-screens.md`
- 2026-11-14 — `destination-not-click` — the network rule asks what a request tells
  someone else, not whether the user clicked; local download and object URLs are
  not egress, third-party fetches are never allowed (ADR 0020) —
  vault: `learning-notes/concepts/destination-not-click.md`
- 2026-11-14 — `conversation-count-not-message-count` — a thread object's first
  array is its messages, so the stored entry count is a message count; the screen
  counts conversations (121 inbox, 142 requests), and the two numbers differ for a
  measured reason —
  vault: `debug-log/2026-11-14_message-count-and-attachments.md`
- 2026-11-14 — `attachment-placeholder-is-export-text` — "You sent an attachment."
  is a literal Instagram writes when it omits the file; 17,200 such messages in
  the baseline are a note, not a dead image slot —
  vault: `learning-notes/concepts/attachment-placeholder.md`
- 2026-11-14 — `provenance-from-path` — a media path already names the message
  family, thread and filename; derive the label at render, add no stored field
  (ADR 0021) —
  vault: `learning-notes/concepts/provenance-from-path.md`
- 2026-11-14 — `search-is-a-view` — an in-memory index over 33,870 message bodies
  builds after the reveal in ~168 ms and answers in ~0.1 ms; no persistence, no
  worker, and a reload gates it again —
  vault: `mind-maps/2026-11-14_t5-search.md`
- 2026-11-14 — `label-less-container-hides-turns` — `labelItemsOf` drops a
  container with no `label`; the AI conversation's 29 turns live in exactly that
  container, so the reader must read the raw `label_values` —
  vault: `architecture/2026-11-14_t5-screens.md`
- 2026-11-14 — `no-utility-css` — Tailwind is removed; the token file and
  hand-written classes are the only styling system, and the framework cannot
  return through a stylesheet —
  vault: `learning-notes/concepts/no-utility-css.md`
- 2026-11-14 — `reset-is-part-of-the-design` — removing the framework removed its
  preflight reset; the browser defaults returned until an explicit reset restored
  the pixels —
  vault: `debug-log/2026-11-14_tailwind-preflight.md`
- 2026-11-14 — `timeline-reuses-grouping` — the media timeline adapts each item to
  the event grouping's `timestamp` and calls `groupByMonthAndYear`; it does not
  write a second year/month grouping —
  vault: `mind-maps/2026-11-14_m25-views.md`
- 2026-11-14 — `owner-is-one-sender-match` — the account holder is identifiable
  only when exactly one distinct sender_name matches the exported Name/Username;
  zero or several matches is a labelled list, never a frequency guess —
  vault: `architecture/2026-11-14_m25-styling-and-connections.md`
- 2026-11-14 — `diff-by-username` — followers and following are compared by
  username; a username-less record is kept in `unmatched` and counted in none of
  the three sets —
  vault: `architecture/2026-11-14_m25-styling-and-connections.md`
- 2026-11-14 — `csv-formula-injection` — a cell beginning with `=`, `+`, `-`, `@`
  or a tab is prefixed with one apostrophe before RFC 4180 quoting; the user's own
  message is still untrusted input to a spreadsheet —
  vault: `learning-notes/concepts/csv-injection.md`
- 2026-11-14 — `print-and-download-are-local` — print and CSV are user-initiated
  local actions under ADR 0020; the print control exists only after the reveal,
  and the CSV is a blob URL, not a request —
  vault: `learning-notes/2026-11-14_session-22.md`
