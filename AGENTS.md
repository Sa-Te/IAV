# AGENTS.md — InstaVault

Read this before every task. This is a contract, not a suggestion.
If a rule blocks you, say so and stop. Do not quietly work around it.

---

## 0. What this is

InstaVault turns an Instagram data export ZIP into a beautiful, browsable
gallery. Instagram gives you a folder of JSON and media with no way to look at
it. We fix that.

**The one-sentence test for every change:**

> A stranger drops their ZIP into the tab, sees their own archive rendered
> beautifully, and DevTools Network shows nothing leaving the device.

If a change makes that sentence less true, the change is wrong.

**Status:** pre-alpha rewrite. v1 = browser-only, no accounts, no server.
Frozen reference: `reference-backend/` (Go). Read it as a specification, never
as something to run in v1.

---

## 1. Invariants — violating one means revert the change

1. **No network egress.** No fetch/XHR/WebSocket/beacon to any origin other
   than same-origin static assets. No analytics, no telemetry, no runtime CDN,
   no remote fonts, no remote images. A test greps the built bundle to enforce
   this.
2. **No server.** No API routes, no server components in the pipeline, no
   database, no auth in v1.
3. **User data lives in the browser only.** IndexedDB for archive records and
   media blobs; `localStorage` for UI settings and nothing else.
4. **No secrets, no required env vars.** There is nothing to leak. If you find
   yourself wanting an env var, stop and raise it.
5. **Licence is AGPL-3.0.** No dependency with an incompatible licence. No
   dependency added without reading its licence.
6. **`archive/` never leaves this machine.** It is a real personal export and
   contains third parties' messages. Gitignored, never committed, never copied
   into fixtures. Test fixtures are small synthetic or redacted extracts.
7. **Photos and messages are other people's data too.** The archive contains
   DMs written by people who never chose to use this tool. Any feature that
   surfaces them (search, share, export) gets an explicit privacy note in its
   ADR before it gets built.

---

## 2. Architecture

Dependency direction points inward. Nothing may import outward.

```
apps/web/            Vite + React Router, static build. UI, routes, React state.
  └─ features/       one folder per view (gallery, stories, messages, ...)
packages/core/       Pure TypeScript. Parsers, schemas, domain model.
  └─ parsers/        one file per archive category
  └─ schema/         zod schemas + inferred types
packages/storage/    IndexedDB adapter. The only place that touches IDB.
packages/worker/     Web Worker entry. Runs core, writes storage, posts progress.
```

Rules:

- **`packages/core` imports nothing from `apps/web`, React, the DOM, or the
  network.** It must run under `node` in a test with no jsdom. This is what
  makes it testable and portable.
- **`packages/storage` is the only module that touches IndexedDB.** No `indexedDB`
  or Dexie import outside it.
- **The render layer never touches network or storage directly.** Views read
  through a repository object passed down or from a store; they never call
  `fetch`.
- **Build tool is Vite (ADR 0004). Next.js appears only in `reference-frontend/`
  and is never imported.**

### The seam that keeps offline mode possible

Every data access goes through one interface:

```ts
interface ArchiveRepository {
  listMedia(filter: MediaFilter): Promise<Page<MediaItem>>;
  getMediaBlob(id: string): Promise<Blob | null>;
  getCategory<K extends CategoryKey>(key: K): Promise<CategoryData[K]>;
  summary(): Promise<ArchiveSummary>;
}
```

One implementation now (`LocalArchiveRepository` over IndexedDB). This exists so
an offline/all-platform build later is a wrapper, not a fork — the one rule from
the old CLAUDE.md worth preserving.

---

## 3. Complexity rules (Ousterhout — enforced, not aspirational)

These are the rules most likely to be broken by a well-meaning agent. Each one
has a concrete failure it prevents.

- **Deep modules.** Simple interface, substantial implementation. A new module
  with a wide interface and a thin body is classitis — merge it.
- **Define errors out of existence.** This is the rule that killed the original
  bug. Do not model failure as "still loading". A media fetch has exactly three
  states — `pending | ready | failed` — as one discriminated union, and it is
  impossible to construct `pending` forever. Same for every async operation.
  Never `if (!res.ok) return;` with state left half-set.
- **No information leakage.** If two modules both know the shape of an archive
  JSON file, that knowledge lives in the schema, not in both. If you find
  yourself writing the same field name in two places, stop.
- **Different layer, different abstraction.** The parser speaks archive
  vocabulary (`ig_stories`, `uri`). The UI speaks domain vocabulary (`MediaItem`,
  `caption`). Translation happens once, in core. Do not leak `ig_` prefixes to
  components.
- **Pull complexity downward.** Hard stuff belongs in core, where it is tested.
  A view should be boring.
- **Comments explain _why_ and _contract_.** Not what the next line does. If the
  interface isn't obvious from the types, the types are wrong.
- **No pass-through methods.** A function that only forwards its arguments is
  noise — call the target directly.
- **Strategic, not tactical.** If a fix requires a hack you can't justify in one
  sentence, stop and propose the real fix instead.

---

## 4. Minimalism (Ponytail)

Climb the ladder before writing code:

1. Does this need to exist at all? Speculative need → skip it and say so.
2. Does it already exist in this repo? Reuse before you write.
3. Does the standard library do it? Use it.
4. Does the platform do it? Native `<input type="file">`, CSS, IndexedDB
   constraints over app-level validation.
5. Does an already-installed dependency do it? Use it.
6. Can it be one line?
7. Only then, the minimum code that works.

Corollaries: no interface with one implementation (except the repository seam,
which exists for a named second caller). No factory for one product. No config
for a value that never changes. No scaffolding "for later".

**Feature coverage is not the same as abstraction count.** Implementing all 20+
archive categories is a product decision and it's in scope. Building a shared
`CategoryFramework<T>` before the third category needs it is not. Two
similar-looking parsers are cheaper than one clever one.

**Mark deliberate shortcuts** with a `ponytail:` comment naming the ceiling and
the upgrade path.

---

## 5. Code rules

- TypeScript `strict`. Zero `any`, zero `@ts-ignore`, zero non-null `!` on
  external data. (The old code held this line — keep it.)
- Validate at every trust boundary: archive JSON is untrusted input.
- A file over ~250 lines is a signal to examine responsibilities, not an
  automatic split. Splitting to hit a line count is classitis.
- No `console.log` in shipped code. Instrument through a single logger that is
  silenced in production.
- Every async function either returns a typed result or throws — never returns
  `undefined` to mean "something went wrong".
- Dates: store ISO strings, display localised. Never a `Date` in a schema.
- No barrel files that re-export everything; they hide dependency direction.

---

## 6. Data contracts

- Every archive file has a **zod schema**. Types are `z.infer`d — never
  hand-written twice.
- Parsers **never throw on unexpected input**. They return a discriminated
  result:

  ```ts
  type ParseResult<T> =
    | { ok: true; data: T; warnings: Warning[] }
    | { ok: false; reason: string; raw: unknown };
  ```

- Unknown or unmapped fields are preserved in `raw` and reachable through the
  "Raw data" fallback view. Nothing is silently dropped.
- Every schema records the archive's shape fingerprint (ADR 0005). There is no
  format version in the export to read.
- Field names follow the domain model. Instagram's `ig_` prefixes exist only
  inside `packages/core/parsers/`.
- Category resolution never matches an exact path. Matching is basename pattern
  first, structural signature second, unrecognised bucket last. See ADR 0002.
- Open questions in `docs/archive-manifest.md` §10 are resolved inside the parser that
  consumes them, not in advance. Each resolution commits its probe, records the measured
  evidence and a confidence level in §11, and stores any uninterpretable value verbatim as
  opaque. A question is never answered by inference alone.

---

## 7. Performance budgets

These are checked, not hoped for.

- Time to interactive with an empty cache: **< 1.5s**.
- Parsing a 160MB / 700-file export: **< 90s** in a worker, with progress
  events at least every 2 seconds. The main thread must never block > 50ms.
- Virtualise only above 2,000 rendered tiles. The measured archive is 376 media items across
  every category; a grid of everything fits without virtualisation. Revisit when a real
  archive exceeds the ceiling, and record the measurement that triggered it.
- Tables paginate at 100 rows. Virtualise only above 2,000 rendered tiles.
- 3D views hold at most 96 textures at 256px (≈25 MB). The window advances; it never
  grows. Report resident bytes in the dev overlay.
- No request may be pending without a deadline. A promise that cannot settle is a permanent
  loading state, which is the original bug.
- Thumbnails generated off the main thread (`createImageBitmap` +
  `OffscreenCanvas` in the worker). Never decode full-res media for a grid tile.
- Blob URLs live in one LRU cache with an explicit revoke policy. Unbounded blob
  growth is a bug.
- One media cache module, LRU by count with explicit revoke and close. No
  module-level singleton. Grid tiles use thumbnails; only the detail view decodes
  an original.
- IndexedDB writes are batched in transactions. One transaction per record is a
  bug.
- Importing a 160MB export must emit progress at least every 2 seconds and must never
  leave the job in a state it cannot leave.

---

## 8. Visual standards

**Tokens are the single source of truth.** `packages/tokens/src/tokens.css` holds
every colour, space step, radius, type size, shadow and the one glass recipe, as
plain custom properties. Tailwind v4 maps its names onto those properties in
`apps/web/src/styles/app.css` (`@theme`); it defines no value of its own. Any future
view — DOM, canvas or WebGL — reads the same tokens.

- **Two themes, named Umber (dark) and Paper (light).** Both are data on
  `[data-theme]`, plus a `prefers-color-scheme` fallback while no explicit choice is
  stored. Themes are never branches in components. "Nebula" and "Starlight" survive
  only inside `reference-frontend/` and are not this project's palette.
- **No raw hex outside the tokens file.** No arbitrary Tailwind values
  (`bg-[#123]`, `p-[13px]`, `mt-[7px]`). **No gradients anywhere.** `pnpm
  check:styles` fails the build on all three, printing `file:line`.
- **Accent is a signal, not a surface.** Links, focus rings, the active nav item and
  the reveal button. It covers ≤5% of any screen. Everything else is canvas, surface,
  border and text.
- **Fonts are self-hosted, latin subset, `font-display: swap`.** Inter (400/500/600),
  JetBrains Mono (400/500), Lora italic (400) for detail-view captions only. AGENTS
  §1.1 applies to fonts explicitly: no remote font request, ever. The added gzip bytes
  are reported in the milestone, not discovered in production.
- **The Vercel Web Interface Guidelines are a hard gate.** Before any view is marked
  done, run it through the `web-design-guidelines` skill. Accessibility failures block
  the commit: real focus states, `aria-label` on icon-only buttons, semantic elements
  over `div onClick`, every async state announced.
- **Mistral design analysis is a method, not a palette.** Token discipline, a spacing
  scale that is not ad hoc, a two-family type hierarchy, defined interaction states.
  Do not import its colours or fonts.
- **Motion:** `prefers-reduced-motion` is honoured everywhere — no shimmer, no hover
  transitions, and the 3D view degrades to a static grid rather than a broken canvas.
- **Empty, loading, error and unavailable are four visibly different states**, rendered
  through one component (`apps/web/src/ui/State.tsx`). This is non-negotiable and it is
  the second half of the original bug.
- **3D views (cyclone, map):** WebGL is opt-in. Load with a dynamic import so the GL
  code is its own chunk, ship a non-WebGL fallback, cap the item count, and share the
  same media URL cache as the DOM views.

---

## 9. Testing

- **TDD for `packages/core`.** Write the fixture test before the parser. Every
  new category lands with: one real-shaped fixture, one malformed-input case,
  one empty-file case.
- Test the contract, not the implementation. Tests that break when you rename a
  private function are misaimed.
- Priority order: parsers → repository layer → the media state machine (the
  regression test for the bug we're fixing) → encoding helpers → component
  rendering.
- A test that needs the real `archive/` must skip cleanly when it's absent.
- No test may touch the network or IndexedDB directly; use in-memory fakes.
- Coverage is not a target. A number that goes up because someone tested a
  getter is noise.
- The first module is `fixMojibake` — pure, no dependencies, tests written first.

### Test quality rules

- No test-only branching in production code. If code checks `NODE_ENV === 'test'` or an
  injected flag only tests set, the design is wrong. Restructure, do not special-case.
- Assert values, not calls. `expect(fn).toHaveBeenCalledWith(...)` verifies wiring; only an
  assertion on the output verifies behaviour. A test that passes when the function returns
  garbage is not a test.
- Every module containing a branch, loop or parse gets at least one negative case:
  malformed input, empty input, wrong type.
- Never `.skip` without a linked issue number in the reason string.
- DOM tests run under happy-dom (ADR 0007 if the swap succeeds; jsdom if it does not). A
  hook is tested through renderHook, not split into a pure function plus a route test,
  unless the environment cannot support it — and then the reason is written down.
- Never `passWithNoTests`. A suite that runs zero tests is a failure.
- Coverage percentage is not a gate. Mutation testing is not adopted.
- Integration tests use synthetic fixtures only — never `archive/`, never a redacted slice
  of it. If a test needs the real archive it is a manual check, not a test.
- Synthetic fixtures prove parsing. They do not prove rendering. Every media view carries
  one test where the blob is genuinely absent and one where thumbnail generation rejects —
  because that is the only path a fake repository can lie about by omission.

### Test lanes

- **One lane** (pre-push and CI, target under 20 seconds): `pnpm verify` — typecheck,
  lint, format check, unit and integration tests, boundaries, filesize, build. The hook
  and CI run this identical command; they are never two lists.
- The lane is the full suite by design. If it exceeds 20s, the fix is to make a step
  faster, not to split the commands.
- The lane must stay fast enough that `--no-verify` is never tempting.

---

## 10. CI/CD

Green check on a fresh clone is a feature.

- GitHub Actions on every push and PR: install (single lockfile, pnpm) →
  typecheck → lint → format check → unit tests → build → bundle privacy grep.
- The bundle privacy grep fails the build if the output contains any non-
  same-origin URL, analytics string, or remote font reference.
- Deploy: static export to Cloudflare Pages / Netlify on merge to `main`.
  Preview deploy on every PR.
- One lockfile. One package manager. `npm`/`yarn` artefacts get deleted, not
  tolerated.
- Dependency bumps: pin exact versions, bump to the minimum fixed version when
  an advisory lands, never blindly to latest.
- `reference-backend/` is excluded from CI. It is frozen.
- Branch protection on `main`: a PR requires the CI check to pass. Until a second person
  commits, work stays on `main` directly and the pre-push hook is the local gate.
- Continuous deployment needs a deployment target. There is none until M13. Do not build a
  deploy job for an endpoint that does not exist.
- **CI is truth.** After every push, before any other work, confirm the run for your own
  commit is green: `pnpm ci:status`, or `gh run list --limit 1` then
  `gh run view <id> --log-failed` if red. You may not begin the next milestone while CI is
  red or while you have not checked it.
- A local green is not a green. If local and CI disagree, CI wins and the difference is a
  bug in the local gate.
- Never fix red CI by removing a check, skipping a test, or adding --no-verify. If a check
  is wrong, say so and get approval.
- A milestone may be reported as partial. Finish the commit you are in, run `pnpm verify`,
  push, confirm CI, then report what is done and what is not. An uncommitted half-change is
  never acceptable; a committed, green, explicitly partial milestone is.

---

## 11. Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- One logical change per commit. If a commit message needs "and", split it.
- Branches: `main` is deployable at all times. Work on `feat/<thing>`.
- Never commit: `archive/`, `backend/uploads/`, `*.tsbuildinfo`, binaries,
  `.env*`.
- Every fix for a user-visible bug references the symptom in the commit body.
- History was reset once at rewrite start. After that, no force-pushes to `main`.

---

## 12. Documentation & ADRs

- `docs/ARCHITECTURE.md` — the layer diagram and the dependency rules. Updated
  when the shape changes, not when it doesn't.
- `docs/DATA-MAP.md` — one row per archive category: file name, schema module,
  parser module, view, status (not started / parsed / rendered / tested). This is
  the completion tracker for "every category implemented".
- `docs/adr/NNNN-title.md` — one page per decision that would be expensive to
  reverse. Format: context, options considered, decision, consequences.
- Comments in code explain why. The doc explains what and why-not.

---

## 13. Learning protocol (mandatory)

The point of this project is understanding it. Speed that leaves you unable to
explain the code is not progress.

### Where notes live

Outside the repo, in the Obsidian vault. Never committed. Vault root on this machine:
`/mnt/c/Users/Asuna/Documents/InstaVault/InstaVault/`

| Folder            | What goes in it                                  | Filename                   |
| ----------------- | ------------------------------------------------ | -------------------------- |
| `learning-notes/` | one note per session                             | `YYYY-MM-DD_session-NN.md` |
| `architecture/`   | structural decisions and how things fit together | `YYYY-MM-DD_<topic>.md`    |
| `debug-log/`      | non-trivial bug investigations                   | `YYYY-MM-DD_<bug-slug>.md` |
| `mind-maps/`      | nested bullet outlines of a concept              | `YYYY-MM-DD_<topic>.md`    |

The vault is the private learning trail. `docs/` in the repo is the public engineering
record. Both exist; they are not duplicates. `docs/LEARNING.md` holds a one-line index per
concept and links out to the vault note.

### When to write notes

Only when triggered — not after every message:

- a milestone completes, or a feature works end to end
- an architecture decision is made (also write to `architecture/`)
- a non-trivial bug is fixed (also write to `debug-log/`)
- a concept is complete enough to summarise (also write to `mind-maps/`)
- end of session

### Rules

- One file per purpose. Never dump everything into one note.
- Never write these files into the repo.
- An architecture note does not replace the ADR required by §12. Both are written.
- Write everything as if teaching a smart beginner. Define a term the first time it appears.

### Linking rules (for Obsidian graph view)

- Link notes with Obsidian wikilinks (`[[like this]]`), never plain text or markdown
  links. The graph view only sees wikilinks.
- A concept referenced from more than one session gets its own standalone note in
  `learning-notes/concepts/`, named `<concept-name>.md`, and every session note that
  uses it links to it.
- A note that records a decision links back to its ADR in `docs/adr/` by the ADR's
  number and slug, e.g. `[[0001-browser-only-v1]]`.

### Mind-map structure

A mind-map note is a single nested bullet outline: one concept per branch, no prose
paragraphs. The indentation is the meaning. Filename: `YYYY-MM-DD_<topic>.md` in
`mind-maps/`.

```
- main concept
  - sub-concept
    - detail
```

### Session note format

1. What we worked on
2. What we built / changed — files, one line each
3. Concepts learned — the general idea, one paragraph each
4. Logic & flow — how the pieces connect
5. Teach-back — three sentences you could say to Peter or John without notes
6. Open questions / TODO next session
7. Why not the alternative — what you rejected and why

### Architecture note format

1. What was decided
2. Why — the reasoning
3. Trade-offs — what was rejected and why
4. How it fits the system

### Debug note format

1. Symptom — what you actually saw
2. Root cause — not the symptom
3. Fix — files and lines
4. Lesson — the general principle

If an agent produces a change you cannot explain back, ask it to re-explain or
revert it — never accept it unexplained.

---

## 14. Subagents

Delegate reading-heavy and review work; keep design decisions in the main agent.

| Subagent          | Use for                                                                        | Boundaries                                          |
| ----------------- | ------------------------------------------------------------------------------ | --------------------------------------------------- |
| `explore`         | Mapping unfamiliar code, finding every caller, reading a category's JSON shape | Read-only. Never edits.                             |
| `parser`          | Porting one archive category: schema + parser + tests                          | One category at a time. Touches only its own files. |
| `resolver`        | Adding or correcting a registry entry: match rules, structural signature, tests | One category per task.                              |
| `design-review`   | Web Interface Guidelines audit of a view                                       | Reports findings only, never edits.                 |
| `ponytail-review` | Over-engineering pass on the current diff                                      | Reports deletions only.                             |

Rules: subagents never edit overlapping files in parallel. The main agent reads
every diff before it lands. A subagent's claim about what the code does is an
INFERENCE until the main agent confirms it by reading.

---

## 15. Reporting style

- Label claims **FACT** (I read it, here's the line) or **INFERENCE** (best
  guess). Never blur them.
- Quote code you're describing. Never paraphrase a file from memory.
- If you couldn't read something, say which and why.
- Every browser-only failure report must be paired with /dev/logs output. A description of a
  symptom is not evidence; a copied log line is.
- No "everything is now fixed" without the command and its output that proves it.

### Housekeeping latitude

You do not need permission for corrections that are purely internal
consistency and carry no behaviour change. Make them, and list them in the
report under a **Housekeeping** heading:

- a stale cross-reference (a doc says `§7` where it now means `§13`, a dead
  relative link)
- a comment or doc describing code that has since moved, renamed or changed
- a comment that is now false, or a `TODO` that is already done
- a typo in prose you are already editing
- leftovers from a move or rename: dead config pointing at old paths, build
  caches, ignored artefacts

You DO still stop and ask for:

- any change to a rule in this file, or to what a rule means
- anything that changes runtime behaviour, even by one line
- deleting a file tracked by git
- renaming or renumbering sections
- anything where you would be guessing what a document _meant_ rather than
  correcting what is now provably false
- scope widening: "while I was in there I also refactored X" is not housekeeping

Rule of thumb: if you cannot state the correction as "this sentence is now
false because Y", it is not housekeeping — ask.

### Needs the human

End every report with a numbered list titled "Needs the human": every action only I can
take, each with the exact command or the exact decision required. If there is nothing,
write "Nothing." Never leave an action implied.

---

## 16. Definition of done

**A feature is not done until:** it works with the network tab empty, it has a
test for its parsing logic, it renders distinct empty/loading/error states, it
passes the Web Guidelines audit, it meets its performance budget, and it has a
learning note.

**A category is not done until:** it's in `docs/DATA-MAP.md` and its row says
parsed + rendered + tested.

**A milestone is not done while CI is red, or while the CI run for its commit is
unknown.**

---

## 17. Open decisions — ask, don't assume

- Thumbnail cache eviction policy (LRU size, IndexedDB quota strategy).
- Whether media blobs are stored once and referenced, or copied per category
  that uses them (a photo can appear in posts, stories and archived posts).
- E2EE sync design — deliberately postponed to v2. Do not build toward it
  speculatively beyond the repository seam.
- Retention/erase UX for an archive the user wants to remove from the device.
- One archive in storage at a time. Multiple archives may exist on disk for drift
  comparison; only one is ever imported. `archive-2/` is the working baseline; `archive/`
  stays on disk as the drift reference and is never imported again.
