# Architecture

> **TODO: expand at M1.** This is a stub. It records only the layer shape and
> the dependency-direction rules, copied from [AGENTS.md](../AGENTS.md) §2. The
> full document (module boundaries per feature, the `ArchiveRepository`
> implementation, worker message protocol, IndexedDB schema) is written in M1,
> after the workspace exists.

## Layers

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
| `registry/categories.ts` | The category registry: one data row per archive category, plus the unrecognised bucket (ADR 0002). |
| `registry/resolve.ts` | Maps one file path and its parsed sample to a category id, by name, then structure, then the unrecognised bucket. |
| `registry/fingerprint.ts` | Turns the set of resolved categories and their first-entry keys into a short stable shape id (ADR 0005). |
| `strings/fixMojibake.ts` | Repairs Instagram's double-encoded text in a single string (ADR 0003). |
| `strings/normaliseStrings.ts` | Applies that repair to every string value in a parsed archive, without mutating the input. |

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

**Dependency direction: worker → core → nothing. Storage implements core's ports.**

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
