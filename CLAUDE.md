# InstaVault — Instagram Archive Viewer

## What this is

A privacy-first viewer for Instagram data exports. Users upload their archive ZIP; the app parses every bit of data Instagram stores and presents it in a beautiful, immersive gallery. No server uploads. No tracking. Everything stays on the user's device.

**Dual deployment:**
- **Browser mode**: hosted web app, zero install, works immediately
- **Offline/local mode**: downloadable standalone app (Electron or Tauri — TBD) that runs 100% locally with zero network requests. MUST function with Wi-Fi disabled. All assets bundled — no CDN calls, no font fetching, no telemetry, nothing leaves the machine.

Both modes share the same core codebase. The rendering/parsing layer MUST be completely decoupled from any network or hosting layer so the offline build is a thin wrapper, not a fork. Design every module assuming it could run in either environment.

This is an open-source project built to production standards.

## Tech stack

- **Frontend**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript (strict mode — no `any`, no `ts-ignore`)
- **State**: Zustand v5
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **3D**: Three.js / React Three Fiber (Cyclone View)
- **Backend**: Go (stdlib `net/http`, `pgx/v5` — already implemented)
- **Database**: PostgreSQL 15 (via Docker)
- **Containerisation**: Docker Compose (already implemented)
- **Package manager**: pnpm (current codebase uses npm — migrate to pnpm)

## Commands

### Full stack (Docker — recommended)
```bash
docker compose up --build   # start DB + Go backend + Next.js frontend
docker compose down         # stop all services
```
Services: DB on `localhost:6543`, backend on `localhost:8080`, frontend on `localhost:3000`. Backend uses `air` for hot-reload.

### Frontend only
```bash
cd frontend
pnpm install        # install deps (use pnpm; fallback: npm install)
pnpm dev            # dev server on :3000
pnpm build          # production build — MUST pass before any PR
pnpm lint           # eslint — zero warnings
pnpm typecheck      # tsc --noEmit — must pass clean
pnpm test           # full test suite
pnpm test:watch     # tests in watch mode during development
```

### Backend only
```bash
cd backend
go build ./cmd/api  # build
go run ./cmd/api    # run (needs DATABASE_URL or falls back to localhost:5432)
```
Default fallback DB: `postgres://postgres:letmeinfast@localhost:5432/postgres`

---

## Project structure — MODULAR AND CLEAN

IMPORTANT: keep files short, focused, and well-organised. No god files. No dumping grounds.

**Current layout** (to be refactored into the target structure below):
```
IAV/
├── backend/                    # Go API (already built — net/http, pgx, JWT)
│   ├── cmd/api/main.go         # Entry point — DB connect, migrations, start server
│   ├── internal/
│   │   ├── models/models.go    # All DB + JSON parsing structs
│   │   └── server/             # handlers.go, middleware.go, server.go
│   └── migrations/             # Sequential SQL files (001–009)
├── frontend/                   # Next.js app
│   ├── app/
│   │   ├── (main)/             # Protected routes — gallery, connections, activity…
│   │   ├── login/ register/    # Public auth pages
│   │   └── layout.tsx
│   ├── components/             # Sidebar, Tabs, InteractiveTagCloud
│   └── stores/                 # Zustand: auth, media, activity, interest, ui
└── docker-compose.yml
```

**Target layout** (migrate frontend toward this):
```
src/
├── app/                        # Next.js App Router pages (thin — delegate to features)
│   ├── (marketing)/            # Landing, login, register, tutorial
│   ├── (app)/                  # Authenticated app shell
│   │   ├── upload/
│   │   └── gallery/
│   └── layout.tsx
├── features/                   # Feature modules — each is self-contained
│   ├── archive-parser/         # ZIP extraction, JSON parsing, schema validation
│   │   ├── workers/            # Web Worker files
│   │   ├── schemas/            # Zod schemas for each archive section
│   │   ├── utils/              # Decode helpers, path resolvers
│   │   ├── __tests__/          # Tests for this feature
│   │   └── index.ts            # Public API for this feature (single entry)
│   ├── gallery/                # Grid, Timeline, Map, Cyclone views
│   │   ├── views/
│   │   ├── components/
│   │   └── hooks/
│   ├── detail-view/            # Full-screen media modal
│   ├── media-selection/        # Multi-select, batch download
│   ├── connections/            # Followers/following views
│   ├── activity/               # Likes, comments, searches
│   ├── ads-interests/          # Ad data, interests, tag cloud
│   ├── profile/                # Bio history, settings
│   └── messages/               # DM thread viewer
├── components/                 # Shared UI primitives only (Button, Modal, Skeleton, etc.)
├── hooks/                      # Shared custom hooks
├── stores/                     # Zustand stores
├── lib/                        # Pure utilities (dates, strings, sanitisation)
├── types/                      # Shared TypeScript types and interfaces
├── constants/                  # All magic numbers and strings live here
├── styles/                     # Global styles, theme tokens, font declarations
└── workers/                    # Shared Web Worker utilities
```

### Organisation rules

- **Feature modules are self-contained.** Each feature folder owns its components, hooks, tests, and types. Shared code goes in `components/`, `hooks/`, `lib/`, or `types/` ONLY if 2+ features need it.
- **No file over 200 lines.** If approaching the limit, split it. Extract a hook, a utility, a sub-component. Ask me before splitting so I understand the decision.
- **No barrel exports** (index.ts re-exporting *). They break tree-shaking. Each feature gets one `index.ts` that exports its public API explicitly.
- **Colocate tests.** `__tests__/` inside the feature, not top-level.
- **One component per file.** Always.
- **Group by feature, not by type.** Gallery components live in `features/gallery/components/`, not a global `components/` folder with 50 files.

---

## Archive discovery — FIRST STEP BEFORE ANY CODING

The user's personal Instagram archive is in the project folder at `./archive/`. Before writing any parser code:

1. **Scan the entire archive folder.** List every file, every subfolder, every JSON file. Map the complete structure.
2. **Read and document every JSON file.** Open each one, understand its schema, document every field. No field gets ignored.
3. **Create a manifest.** Write `docs/archive-manifest.md` documenting:
   - Every folder and what it contains
   - Every JSON file with its schema (field names, types, example values)
   - Every media file type found
   - Any unexpected or undocumented files
   - Differences from Instagram's documented export format (if any)
4. **Cross-reference.** Make sure the data categories list below matches what's actually in the archive. If the archive contains data not listed below, ADD it.
5. **Only then build the parser.** The parser must cover 100% of the discovered data. Nothing gets skipped.

IMPORTANT: if any file or field is unclear, ASK me. It's my personal data — I can explain what things mean.

---

## Data categories to extract (exhaustive — verify against archive)

Parse and display ALL of these. The user should see everything Instagram stores:

Posts (photos, videos, carousels) with captions, timestamps, likes, comments, location · Stories (with expiry metadata, poll results, question responses, viewer counts) · Reels · Profile info (bio history, profile photo history, name changes, links) · Followers and following (with follow dates) · Blocked accounts · Close friends list · Liked posts and comments · Saved posts and collections · Comments you've made · Search history · Login activity and IP history · Ads viewed, ads clicked, ad interests, ad topics · Shopping history · Account privacy changes log · Connected apps and websites · Autofill information · Professional dashboard data (if creator account) · Messages (all threads, with media, reactions, shares, unsent messages) · Guide posts · Archived posts · Recently deleted items · Account information (email, phone, DOB, gender) · Contacts synced · Devices logged in · Content you're not interested in · Topics interacted with

**If the archive contains ANYTHING not on this list, add it and build a view for it.**

---

## Archive resilience (future-proofing)

Instagram changes their export format without warning. The parser MUST handle this:

- Zod schema validation on every JSON file — if a field is missing or changed, throw a clear error naming the exact file and field
- Unknown fields get preserved and shown in a "raw data" fallback view, never silently dropped
- Version detection: fingerprint the archive structure to identify format version
- Graceful degradation: if one section fails to parse, the rest of the app still works. Show an error badge on the failing section, not a crash screen.

---

## Design philosophy

"Minimalistic Futurism" — a high-tech gallery that gets out of the way.

- Default theme: **Nebula** (deep blues/purples, neon cyan accents, dark)
- Light theme: **Starlight** (off-whites, light grays, single bold accent)
- CSS variables for all theme tokens — themes are data, not code branches
- Typography: distinctive sans-serif for UI; elegant serif/cursive for captions in detail view
- Motion: smooth, physics-based (Framer Motion spring configs). Every interaction gets a response.

Claude may make design decisions within this philosophy — surprise me, but explain the reasoning.

### UX standard: Google Photos level

- Multi-select: shift-click range, ctrl-click toggle, drag-to-select rectangle in Grid View
- Batch download selected items as ZIP (preserving original filenames and folder structure)
- Keyboard nav: arrow keys between items, Enter to open, Escape to close
- Smooth shared-element transitions from any gallery view to Detail View
- Pinch-to-zoom on touch devices, swipe between items on mobile
- "Best moments" in Cyclone View: high-engagement posts get larger cards and centre positioning

---

## Code standards — STRICT

Meta/Lexical-level standards. No exceptions.

- TypeScript strict mode. No `any`. No `@ts-ignore`. No unsafe `as` casts.
- ESLint + Prettier enforced. Zero warnings.
- No `console.log` in committed code — use a debug utility that strips in production.
- Comments ONLY for "why" — never "what." The code should speak for itself.
- No magic numbers or strings — `src/constants/`.
- Every exported function gets a JSDoc docstring.
- Error boundaries at every route segment.

### Naming

Components: `PascalCase.tsx` · Utilities: `camelCase.ts` · Types: `PascalCase.types.ts` · Constants: `SCREAMING_SNAKE_CASE` · Tests: `*.test.ts(x)` in `__tests__/`

### Security — NON-NEGOTIABLE

- All user content sanitised with DOMPurify before rendering.
- Never `dangerouslySetInnerHTML` without sanitiser.
- Archive parsing in Web Worker — never block main thread.
- No eval, no Function constructor, no dynamic script injection.
- CSP headers configured. Dependency audit before any new package.
- IMPORTANT: security concern? STOP and discuss before proceeding.

### Performance

- Lazy-load images. Virtual scrolling for lists > 100 items.
- ZIP parsing streams entries — never load full archive into memory.
- No page bundle > 200kb gzipped. Lighthouse after every major feature.

---

## Testing — ZERO TOLERANCE FOR FAILING TESTS

### Rules

1. **Write tests alongside code.** Every PR includes tests. No exceptions.
2. **Tests MUST pass.** Run `pnpm test` before finishing any task. If any fail, FIX THEM before moving on. Never leave failing tests.
3. **If a test fails, fix the code OR the test** — explain which was wrong and why. Never silently delete a test.
4. **Test types required:**
   - **Unit tests**: every utility, parser function, Zustand action (Vitest)
   - **Component tests**: interactive components (React Testing Library). Test user behaviour, not implementation.
   - **Integration tests**: archive upload → parse → display (the critical path)
   - **Schema tests**: every Zod schema validated against real archive fixture data
   - **Snapshot tests**: sparingly, for complex UI where visual regression matters
5. **Test edge cases explicitly:**
   - Empty archive (no posts, no messages)
   - Malformed JSON (corrupted, truncated)
   - Missing fields (Instagram removed a field between versions)
   - Huge archives (10k+ posts — mocked data)
   - Unicode edge cases (emoji, RTL, zero-width chars)
   - Missing media files (referenced in JSON but not in archive)
6. **Fixtures**: `__tests__/fixtures/` with anonymised sample JSON. Never commit my actual personal data.
7. **Coverage**: 80%+ parser, 70%+ UI. Don't chase 100%.
8. **After every implementation, ALL FOUR must pass:**
   ```
   pnpm test && pnpm typecheck && pnpm lint && pnpm build
   ```

---

## Teaching mode — IMPORTANT

I am learning. This project is my classroom.

1. **Explain before implementing.** New pattern? Explain what and why in 3-5 sentences BEFORE writing code.
2. **Ask before deciding.** Multiple valid approaches? Present trade-offs, let me choose.
3. **Name the concepts.** "This is the Observer pattern." "This is a discriminated union." Build my vocabulary.
4. **Challenge me.** After something significant, quiz me. If I get it wrong, teach me.
5. **Link to docs.** Specific API page, not the homepage.
6. **Flag anti-patterns.** If I suggest bad practice, say why and show the better way.
7. **Write learning notes** to `docs/learning-notes/YYYY-MM-DD-topic-slug.md` (synced to Obsidian).
8. **Write mind-map notes** to `docs/mind-maps/` for architectural decisions — see format below.

### Mind map format (for Obsidian graph view)

```markdown
---
date: YYYY-MM-DD
type: mind-map
feature: [feature-name]
connections: [[Related Concept 1]], [[Related Concept 2]]
---

# [Feature] — Decision Map

## Central concept
[One sentence]

## Branches
- **Chosen approach**: [what] → why
- **Rejected alternatives**: [what] → why not
- **Dependencies**: [what this connects to]
- **Risks**: [what could go wrong]
- **Open questions**: [to revisit]

## Connections
- Feeds into: [[Next Feature]]
- Depends on: [[Previous Feature]]
- Blocks: [[Future Feature]]
```

---

## Git workflow & GitHub reminders

- Main: `main` (always deployable). Feature branches: `feat/...`, `fix/...`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- IMPORTANT: never force-push to main. Never commit directly to main.

### PUSH REMINDERS

**After ANY of these, remind me to push to GitHub:**
- Phase checklist item completed
- New feature working end-to-end
- Significant refactor finished
- End of any coding session
- Bug fixed
- Tests all passing after new code

Use this exact phrase: **"This is a good checkpoint — push to GitHub before we continue."**

---

## Build order (phased)

### Phase 0 — Archive discovery (DO THIS FIRST)
- [ ] Scan `./archive/` folder completely
- [ ] Document every file and JSON schema in `docs/archive-manifest.md`
- [ ] Create mind-map of data relationships
- [ ] Verify data categories list covers everything found

### Phase 1 — Foundation
- [x] Next.js scaffold, project structure (exists — needs strict TypeScript + `src/` migration)
- [ ] Tailwind + theme system (CSS variables, Nebula + Starlight)
- [ ] Linting, prettier, husky pre-commit hooks
- [x] Zustand stores, base layout with sidebar (exists — needs refactor into feature modules)

### Phase 2 — Archive parsing
- [x] ZIP upload + extraction (exists in Go backend — needs Web Worker port for offline mode)
- [x] Parser for posts, stories, connections, hashtags, ad interests, activity log (Go backend)
- [ ] Zod schemas for every archive section (frontend validation)
- [ ] Parser with graceful degradation + "Raw data" fallback view
- [ ] Media indexing and thumbnail generation
- [ ] Full test suite with fixtures

### Phase 3 — Core views
- [x] Gallery page (basic grid — needs virtual scrolling + multi-select)
- [x] Connections view (exists — needs polish)
- [x] Activity, Hashtags, Interests views (exist — needs polish)
- [ ] Detail View modal (full-screen, download, swipe, keyboard)
- [ ] Timeline View + scroll animations
- [ ] Search + filter (date, type, caption, location)
- [ ] Batch download as ZIP

### Phase 4 — Advanced views + all data sections
- [ ] Map View, Cyclone View (3D + "best moments")
- [ ] Messages, Profile views
- [ ] Every remaining data category from archive manifest

### Phase 5 — Polish & ship
- [ ] Landing page, tutorial, onboarding
- [ ] Accessibility (WCAG 2.1 AA), performance (Lighthouse 90+)
- [ ] Offline build (Electron/Tauri wrapper)
- [ ] README, contributing guide, license, CI/CD

### Phase 6 — Backend evolution
- [x] Go backend (exists — `backend/`, JWT auth, PostgreSQL, REST API on :8080)
- [x] Docker Compose (exists — DB + backend + frontend)
- [ ] Drive integration, migration helper, data diff tool

---

## Existing backend — key facts

The Go backend at `backend/` is already functional. Know this before touching it:

- **Archive processor**: `processorMap` in `handlers.go` maps JSON filename suffixes → processor methods. To support a new archive file, add one entry there + write the method.
- **Posts/stories** require ISO-8859-1 → UTF-8 decode (`charmap.ISO8859_1`) — Instagram exports them with broken encoding.
- **JWT secret** is hardcoded in two places: `loginHandler` and `authMiddleware`. If changed in one it must be changed in both.
- **Migrations** run on every startup — safe because every SQL uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`. New migrations need a file in `backend/migrations/` AND a call in `runMigrations` in `main.go`.
- **CORS** is locked to `http://localhost:3000` in `server.go`.
- **Media files** are stored at `uploads/<userID>/` inside the backend container and served via `/api/v1/mediafile/<path>`.
- **`activity_log`** has no unique constraint — re-uploading the same archive duplicates entries.

---

## Git commit rules

- **Never add a `Co-Authored-By` line** to commit messages.

## Things Claude MUST NOT do

- Never modify parser without explaining and getting approval
- Never add a dependency without stating why and alternatives
- Never use `any` type — find or create the correct type
- Never commit code that doesn't pass lint + typecheck + test + build
- Never skip error handling
- Never store user data outside the browser
- Never add analytics, tracking, or external network requests
- Never leave failing tests
- Never create files over 200 lines without splitting
- Never dump unrelated components into shared folders
- Never skip writing tests for new code
- Never commit my personal archive data — use anonymised fixtures

## When I say...

- "make it beautiful" → layout, spacing, animation, typography
- "archive" → Instagram data export ZIP/folder
- "gallery" → main media browsing dashboard
- "parser" → ZIP/JSON extraction pipeline
- "production ready" → Lighthouse 90+, zero errors, full tests, CSP
- "like Lexical" → strict types, clean abstractions, thorough tests
- "push it" → remind me to git push to GitHub
