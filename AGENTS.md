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
apps/web/            Next.js, static export. UI, routes, React state.
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
- Every schema carries the export format version it targets. A schema change is
  an ADR.
- Field names follow the domain model. Instagram's `ig_` prefixes exist only
  inside `packages/core/parsers/`.

---

## 7. Performance budgets

These are checked, not hoped for.

- Time to interactive with an empty cache: **< 1.5s**.
- Parsing a 160MB / 700-file export: **< 90s** in a worker, with progress
  events at least every 2 seconds. The main thread must never block > 50ms.
- Grid scroll: **60fps** with 500+ items. Virtualise; do not render 10,000 tiles.
- Thumbnails generated off the main thread (`createImageBitmap` +
  `OffscreenCanvas` in the worker). Never decode full-res media for a grid tile.
- Blob URLs live in one LRU cache with an explicit revoke policy. Unbounded blob
  growth is a bug.
- IndexedDB writes are batched in transactions. One transaction per record is a
  bug.

---

## 8. Visual standards

The existing visual language is ours and it's good — keep it. Nebula (default
dark) and Starlight (light) as defined in the design notes, Liquid Glass surfaces
reserved for floating layers, Inter / Lora / JetBrains Mono. Themes are data
(tokens), never branches in components.

- **All colours, spacing, radii, type sizes come from tokens.** No raw hex, no
  arbitrary Tailwind values like `mt-[13px]`, no inline styles for anything a
  token covers.
- **The Vercel Web Interface Guidelines are a hard gate.** Before any view is
  marked done, run it through the `web-design-guidelines` skill. Accessibility
  failures block the commit. Specifically: real focus states, `aria-label` on
  icon-only buttons, semantic elements over `div onClick`, every async state has
  a live-region announcement.
- **Mistral design analysis is a method, not a palette.** Use it for token
  discipline, a spacing scale that isn't ad hoc, a two-family type hierarchy and
  defined interaction states. Do not import its colours or fonts.
- **Motion:** `prefers-reduced-motion` is honoured everywhere, including the 3D
  view (which degrades to a static grid, not a broken canvas).
- **Empty, loading and error are three visibly different states.** This is
  non-negotiable and it's the second half of the original bug.
- **3D views (cyclone, map):** WebGL is opt-in. Load dynamically with
  `ssr: false`, ship a non-WebGL fallback, cap the item count, and share the
  same media URL cache as the DOM views. Build the cyclone only after
  `useMediaUrl()` exists and the 2D gallery is solid.

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

| Folder | What goes in it | Filename |
|---|---|---|
| `learning-notes/` | one note per session | `YYYY-MM-DD_session-NN.md` |
| `architecture/` | structural decisions and how things fit together | `YYYY-MM-DD_<topic>.md` |
| `debug-log/` | non-trivial bug investigations | `YYYY-MM-DD_<bug-slug>.md` |
| `mind-maps/` | nested bullet outlines of a concept | `YYYY-MM-DD_<topic>.md` |

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

### Session note format

1. What we worked on
2. What we built / changed — files, one line each
3. Concepts learned — the general idea, one paragraph each
4. Logic & flow — how the pieces connect
5. Teach-back — three sentences you could say to Peter or John without notes
6. Open questions / TODO next session

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
- No "everything is now fixed" without the command and its output that proves it.

---

## 16. Definition of done

**A feature is not done until:** it works with the network tab empty, it has a
test for its parsing logic, it renders distinct empty/loading/error states, it
passes the Web Guidelines audit, it meets its performance budget, and it has a
learning note.

**A category is not done until:** it's in `docs/DATA-MAP.md` and its row says
parsed + rendered + tested.

---

## 17. Open decisions — ask, don't assume

- Thumbnail cache eviction policy (LRU size, IndexedDB quota strategy).
- Whether media blobs are stored once and referenced, or copied per category
  that uses them (a photo can appear in posts, stories and archived posts).
- E2EE sync design — deliberately postponed to v2. Do not build toward it
  speculatively beyond the repository seam.
- Retention/erase UX for an archive the user wants to remove from the device.
