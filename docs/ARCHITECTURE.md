# Architecture

## Layers

Dependency direction points inward. Nothing may import outward.

```
apps/web/            Vite + React Router, static build. UI, routes, React state.
  └─ categories/     category screens, tables, trees, the reveal gate
packages/core/       Pure TypeScript. Parsers, schemas, domain model.
  └─ parsers/        one file per archive category
  └─ schema/         zod schemas + inferred types
packages/storage/    IndexedDB adapter. The only place that touches IDB.
packages/worker/     Web Worker entry. Runs core, writes storage, posts progress.
```

## Dependency rules

- **`packages/core` imports nothing from `apps/web`, React, the DOM, or the
  network.** It must run under `node` in a test with no jsdom. This is what
  makes it testable and portable.
- **`packages/storage` is the only module that touches IndexedDB.** No
  `indexedDB` or Dexie import outside it.
- **The render layer never touches network or storage directly.** Views read
  through a repository object passed down or from a store; they never call
  `fetch`.

## The seam that keeps offline mode possible

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

## Core modules

Every module below lives in `packages/core/src` and is pure TypeScript: no React,
no DOM, no network, no storage. `pnpm check:boundaries` enforces that.

| Module | One-line responsibility |
| --- | --- |
| `registry/categories.ts` | The category registry: one data row per archive category, plus the unrecognised bucket (ADR 0002). A row carries a privacy tier and, where the words inside are someone else's, a `gated` flag (ADR 0014). |
| `schema/posts.ts`, `parsers/posts.ts` | The two measured `posts` shapes (legacy media groups and label/value envelopes), deduplicated by media URI (docs/T3-DESIGN.md §2). |
| `registry/resolve.ts` | Maps one file path and its parsed sample to a category id, by name, then structure, then the unrecognised bucket. |
| `registry/fingerprint.ts` | Turns the set of resolved categories and their first-entry keys into a short stable shape id (ADR 0005). |
| `strings/fixMojibake.ts` | Repairs Instagram's double-encoded text in a single string (ADR 0003). |
| `strings/normaliseStrings.ts` | Applies that repair to every string value in a parsed archive, without mutating the input. |
| `categories/toTableView.ts` | Interprets a category payload: four observed shapes → a table with labels taken verbatim, or a raw tree. Pagination constant lives here. |
| `categories/labelValues.ts` | The label/value envelope read once: label, value, timestamp, nested dict/vec, description and href, shared by the table and the bespoke screens. |
| `categories/entries.ts` | The two container shapes every reader shares: entries inside one payload, and payloads of a category fed by several files. |
| `categories/format.ts` | Text and timestamp presentation shared by the table and the screens; timestamps are Unix seconds. |
| `categories/settingsView.ts` | A label/value record → labelled fields, nested sections, timestamps and absent values; `null` when the record is not that shape. |
| `categories/avatarItemsView.ts` | `avatar_items` → URL records with an ordinal and a localised acquisition time; `null` when the shape does not match. |
| `categories/deviceEffectsView.ts` | Repeated device records grouped by identity and deduplicated only when the profile is identical; `null` when it cannot be honest. |
| `categories/eventListView.ts` | A dated label/value record → year → month → day → row, with the measured hero/date/URL mapping and the 25-month threshold for the year fold (ADR 0015); `null` when the record is not an event list. |
| `categories/eventPreview.ts` | The two sticker/poll shapes whose values are presentation: a colour and an option's font size (ADR 0016); everything else keeps the field list. |
| `categories/nestedUrl.ts` | The one reader of label-less containers, and only to find the link a story reaction, question or quiz keeps inside one. |
| `categories/savedByFolder.ts` | Collections as folders of their nested posts, and the flat saved list grouped by them with URL as identity (ADR 0017). |
| `categories/entryCount.ts` | The count a screen prints when it differs from the raw per-file sum: `posts` can arrive twice in one export, and a message category stores messages while its screen shows conversations (M24). |
| `categories/nameListView.ts` | A vec of names/places plus optional explanatory text → a paginated name list; `null` when the record has neither. |
| `categories/aiConversationView.ts` | `ai_conversations` → a labelled record and its ordered turns, read from the one label-less container; `null` when the turn container is absent. |
| `domain/provenance.ts` | A media path → message family/thread/filename or category id; no stored field (ADR 0021). |
| `search/index.ts` | A pure in-memory index over message bodies, case/diacritic/whitespace-insensitive, with bounded snippets; a short query returns nothing (D3). |
| `categories/personView.ts` | T4's twelve measured person rows → one card model (display name, username, export profile URL, date), year-grouped and alphabetically ordered; a hashtag or contact record returns `null` (ADR 0019). |
| `categories/tagView.ts` | `following_hashtags` → tag, tag-page URL and date; `null` for any other category. A tag is not a person. |
| `categories/privacy.ts` | Which categories gate — tier 5 or the registry's `gated` flag — and the copy shown before one is revealed; reads the registry, never a hardcoded id list (ADR 0014). |
| `media/cache.ts` | Bounded media cache: one entry and one in-flight decode per path, LRU by count at 150, evict = revoke URL then close bitmap, `releaseAll` for teardown. |
| `media/thumbnail.ts` | Thumbnail geometry and the encode contract: max edge 512, aspect preserved, never upscaled, type taken from what the encoder produced. |
| `messages/threads.ts` | Thread identity from the path (family + folder), summaries, newest-first ordering, and one thread's messages in chronological order. |

The registry is **data, not code**: adding a category is one row. `registry.test.ts`
fails the moment a row is added without a match rule or signature, or when the
registry and `docs/DATA-MAP.md` drift apart.

## Ingestion, storage and the worker

| Module | One-line responsibility |
| --- | --- |
| `packages/core/src/ingest/job.ts` | The job state machine: no booleans, `parsing` always carries `done`/`total`, a persisted `parsing` record recovers as `interrupted`. |
| `packages/core/src/ingest/ingest.ts` | Runs one import: validate, resolve, normalise, store, report progress, honour cancellation. |
| `packages/core/src/ingest/port.ts` | The `IngestSink` port the pipeline writes through, plus its record types. |
| `packages/storage/src/localArchiveRepository.ts` | IndexedDB implementation of `IngestSink` and `ArchiveRepository`; batched transactions, quota estimate, atomic clear. |
| `packages/storage/src/db.ts` | The versioned schema and its single upgrader. |
| `packages/worker/src/index.ts` | Worker host: owns the run, posts progress, depends only on the port. |
| `apps/web/src/repository/RepositoryContext.tsx` | The read path: the one place a view obtains an `ArchiveRepository`; components never touch IndexedDB. |
| `apps/web/src/media/useMediaUrl.ts` | Three-state media (`pending` / `ready` / `failed`), one shared request per id, object URLs revoked on unmount. |
| `apps/web/src/media/MediaGrid.tsx` | Responsive grid of `MediaItemView`; takes data and a media source as props. |
| `apps/web/src/media/MediaTile.tsx` | One tile: pending skeleton, image, video frame, or a failure naming its reason. |
| `apps/web/src/media/MediaDetail.tsx` | Full-size view, caption, timestamp, category; Escape closes and focus returns. |
| `apps/web/src/media/useMediaList.ts` | Pages one category — or every category — out of the repository. |
| `apps/web/src/routes/CategoryGallery.tsx` | One page parameterised by category; `/`, `/posts`, `/stories`, `/archived`. |
| `apps/web/src/routes/Nav.tsx` | Categories that actually have media, with counts; `aria-current` comes from the router. |
| `apps/web/src/categories/CategoryView.tsx` | `/categories/:id`: renders the panel `screenOf` chose and keeps loading / empty / failed distinct; the repository read happens inside the gate. |
| `apps/web/src/categories/screenOf.ts` | The measured screen choice: T1 settings/avatar/device, T2 event/profile/name list/settings, T3 event/saved list, T4 person/tag list, T5 AI record / payment settings / viewed-posts, then table or tree. |
| `apps/web/src/people/PersonCard.tsx` | One person: initials on a token surface, display name, @username, localised date, and the export's own profile URL as a real outbound link; no avatar image exists (ADR 0019). |
| `apps/web/src/people/PersonListView.tsx` | The T4 person list: year sections, alphabetical inside a year, 200 cards at a time, raw JSON behind the one disclosure. |
| `apps/web/src/people/TagListView.tsx` | `following_hashtags`: tag, tag-page link and date; deliberately not a person card. |
| `apps/web/src/styles/people.css` | The person cards and tag list; tokens only. |
| `apps/web/src/categories/settingsFields.tsx` | The field renderer: definition lists, nested sections, opaque values that expand on focus, real links and timestamps. |
| `apps/web/src/categories/SettingsView.tsx` | The T1 label/value screen: one entry as a page, many as sections, raw JSON behind a closed disclosure. |
| `apps/web/src/categories/AvatarItemsView.tsx` | The avatar grid: labelled placeholders, no invented thumbnails, the URL as a user-initiated link. |
| `apps/web/src/categories/DeviceEffectsView.tsx` | The device profile: identity and support lists once, the varying records as a list. |
| `apps/web/src/categories/EventListView.tsx` | The event/activity screen for T2 and T3: year button (only over 24 months) → month button → day heading → row, 7 days and 200 rows at a time, URL shortcode link, a sticker/poll preview, raw disclosure. |
| `apps/web/src/categories/SavedFoldersView.tsx` | `saved_collections` and `saved_posts`: one native `<details>` per collection, its posts, and the uncollected remainder, 200 at a time. |
| `apps/web/src/categories/ProfilePhotosView.tsx` | `profile_photos`: the local photo through the three-state media layer, with its caption and date. |
| `apps/web/src/styles/profiles.css` | The profile photo screens (personal_information and profile_photos); tokens only. |
| `apps/web/src/categories/ProfileView.tsx` | `personal_information`: the one local profile photo through the media layer, plus the labelled fields. |
| `apps/web/src/categories/NameListView.tsx` | The three T2 name/place lists, 200 names at a time. |
| `apps/web/src/categories/RawDisclosure.tsx` | The one closed raw-JSON disclosure every bespoke screen ends with. |
| `apps/web/src/categories/counts.ts` | One count vocabulary: 1 entry / 2 entries / 1 media item / 2 media items, and no bare zero. |
| `apps/web/src/styles/settings.css` | The settings, avatar and device screens; tokens only. |
| `apps/web/src/styles/events.css` | The event list, profile photo and name list; tokens only. |
| `apps/web/src/categories/CategoryTable.tsx` | Semantic table, sticky header, 100 rows per page; long values keep their full text in `title`. |
| `apps/web/src/categories/CategoryTree.tsx` | Collapsible JSON tree that builds children only on expand, behind the "we have not interpreted it" banner. |
| `apps/web/src/categories/RevealGate.tsx` | The reveal gate: renders copy + one button, mounts the reader only after the click, never persists the reveal. Used for tier 5, the `gated` comment categories and T4's synced contacts (ADR 0014, ADR 0019). |
| `apps/web/src/media/MediaCaches.tsx` | Creates the per-root original and thumbnail caches from the repository; releases both on teardown. |
| `apps/web/src/media/useInViewport.ts` | IntersectionObserver with a 200px margin; once seen, stays seen, so scrolling back does not re-request. |
| `packages/worker/src/thumbnails.ts` | Decode → OffscreenCanvas → webp (whatever type comes back), off the main thread. |
| `apps/web/src/messages/ThreadList.tsx` | Message categories as a thread list: participants, count, newest date, empty threads marked, plus the gated on-device search box and hash-to-thread opening. |
| `apps/web/src/messages/ThreadConversation.tsx` | One conversation chronologically, attachments inline, a search hit scrolls to its message, and the read-only note. |
| `apps/web/src/messages/MessageAttachment.tsx` | One photo/video/audio attachment with a type label, image dimensions or media duration when the browser knows them; a placeholder with no media says so. |
| `apps/web/src/media/Provenance.tsx` | The "from messages · family · thread" line and link for a message media tile (ADR 0021). |
| `apps/web/src/media/format.ts` | The one `m:ss` formatter shared by video tiles and inline attachments. |
| `apps/web/src/styles/messages.css` | Threads, conversations, attachments and search; tokens only. |
| `apps/web/src/categories/AiConversationsView.tsx` | `ai_conversations`: title and header fields, then the turns as one collapsed ordered list (D2). |
| `apps/web/src/styles/ai.css` | The AI-conversation record; tokens only. |
| `packages/tokens/src/tokens.css` | Every colour, space, radius, type, shadow and glass value; Umber and Paper as data, plus the system fallback. |
| `apps/web/src/ui/State.tsx` | The four async states — loading, empty, error, unavailable — announced and styled once. |
| `apps/web/src/ui/AppShell.tsx` | Skip link, the persistent sidebar, one main landmark, honest footer. |
| `apps/web/src/ui/Sidebar.tsx` | Galleries, five tier disclosures, the modal sheet under 900px (ADR 0011). |
| `apps/web/src/categories/useCategoryRows.ts` | The registry joined to the repository: one hook for the sidebar, the tier pages and the overview. |
| `apps/web/src/routes/TierPage.tsx` | `/tiers/tN`: present category cards first, absent ones in their own group. |
| `apps/web/src/categories/CategoryIndex.tsx` | `/categories`: an overview of the five tiers, not a table of 86 rows. |
| `apps/web/src/media/poster.ts` | One poster frame per video, generated once and stored in the existing thumbs store. |
| `apps/web/src/ui/ThemeSwitch.tsx` | System/Umber/Paper as a native radio group; stores only an explicit choice. |
| `scripts/check-styles.mjs` | Fails the build on a raw hex, an arbitrary Tailwind value or a gradient outside the tokens package. |
| `packages/core/src/cyclone/layout.ts` | Golden-angle spiral with a wrapping vertical coordinate: deterministic, endless, no accumulated state. |
| `packages/core/src/cyclone/projection.ts` | Hand-written perspective projection with DOM-consistent screen coordinates; the source of picking and focus positions. |
| `packages/core/src/cyclone/{picking,window,motion}.ts` | Nearest-visible picking with depth tie-break, the 96-card resident window, and motion that is a no-op under reduced motion. |
| `apps/web/src/cyclone/gl/*` | WebGL2 only: context/caps, one instanced program on a sampler2DArray, the bounded texture window, and a renderer with no clock. |
| `apps/web/src/cyclone/{CyclonePage,CycloneStage}.tsx` | Route and interaction: canvas is aria-hidden, a hidden button list mirrors the sequence, fallbacks for no-GL, few items and reduced motion. |

**Dependency direction: worker → core → nothing. Storage implements core's ports.**
For the cyclone: `gl/` imports core maths and nothing else — no React, no storage;
the route imports `gl/` and the media views; core imports neither. That is what lets
the entire interaction be tested without a GPU.

```
apps/web ──┬─> packages/worker ──> packages/core
           └─> packages/storage ──> packages/core
```

The worker never imports the storage adapter: `apps/web/src/workers/ingest.worker.ts`
is the composition root that constructs both and hands the repository to the host
as an `IngestSink`. `packages/core` imports neither React, the DOM, the network,
nor another workspace package — `pnpm check:boundaries` enforces it.

## Frozen reference implementations

`reference-backend/` (Go + PostgreSQL) and `reference-frontend/` (the shipped
Next.js app) are **frozen reference implementations**, not part of v1.

- They are read as **specification only**: the export format, field names and
  the expected shapes that the TypeScript parsers must reproduce.
- Both are **excluded from CI** and from **every build**.
- Nothing under `apps/` or `packages/` may **import** from either directory.
- Neither is executed or shipped. They exist so that working behaviour (the 3D
  cyclone, the EXIF map, the detail modal, the virtualised grid, the Go
  processors and their test suite) can be **ported, not rewritten**, and so its
  behaviour can serve as an oracle for tests.
- They are not modified except where a real exposed secret has to be replaced
  with a placeholder. See `docs/adr/0001-browser-only-v1.md`.
