# Category recipe

The checklist that makes category 4 through 74 mechanical. Written after doing it twice
(stories, archived posts). It is accurate, not aspirational: each step says what it costs and
what it cannot be skipped.

## The steps

1. **Registry row** — `packages/core/src/registry/data/tier<N>.ts`: id, label, privacy tier,
   variant risk, basename rule, structural signature, `mediaPath`. Copy the id from
   `docs/DATA-MAP.md` exactly; `registry.test.ts` fails on any drift.
2. **Schema** — `packages/core/src/schema/<category>.ts`: a zod schema derived from
   `docs/archive-manifest.md`, with `.loose()` so a new field never fails a parse. Optional
   fields are `optional()`, never nullable-by-guess.
3. **Parser** — `packages/core/src/parsers/<category>.ts`: `parse<Category>(input: unknown):
   ParseResult<readonly Entry[]>` via `safeParse`. On failure return `{ ok: false, reason,
   raw }` — never throw. Translate archive vocabulary (`ig_stories`, `uri`) into domain
   vocabulary here and nowhere else.
4. **Fixtures** — one real-shaped, one malformed, one empty, in the parser's test file.
   Synthetic only (AGENTS.md §9); the real archive is never a fixture.
5. **Tests** — assert a *derived* value (caption, count, timestamp), not "does not throw".
   For media categories, assert the reference count against the fixture.
6. **Media references** — if the category holds media, `toMediaItems` in
   `packages/core/src/domain/media.ts` delegates to the parser. The view layer never learns
   the archive shape.
7. **View** — usually nothing: the shared media layer (`MediaGrid`/`MediaTile`/`MediaDetail`)
   renders any `MediaItemView`. A new view is only needed when the category is not media.
8. **DATA-MAP row** — set the status to what is true: `parsed` only with tests, `rendered`
   only when a route shows it, `tested` only when the three fixtures exist. Do not overclaim.
9. **Learning note** — one line in `docs/LEARNING.md`, one paragraph in the vault.

## What is reusable vs per-category

| Reusable | Per category |
| --- | --- |
| `ParseResult`, `Warning` | the schema |
| the registry data format | the basename rule and signature |
| `toMediaItems` plumbing | how a media reference is written |
| the whole media layer | the caption field name |
| the ingestion pipeline | the media path base |
| `registry.test.ts` drift check | the open question, if any |

## What a subagent may do alone (AGENTS.md §14)

- **`parser` subagent:** steps 2–5 for one category, when the schema is already measured.
  It may not touch the registry, `toMediaItems`, or any route.
- **`explore` subagent:** step 0 (read the manifest, find the shape, propose the schema).
- **Not delegable:** resolving an open question (step 3.2). A probe that decides meaning is a
  judgement about someone's data; the main agent runs it and writes §11.

## Anti-patterns this recipe exists to prevent

- Guessing a key name instead of reading the manifest.
- Sharing one schema between two categories because they look identical today.
- Treating a malformed file as a crash instead of an `ok: false`.
- Marking a row `rendered` because a route *could* render it.
