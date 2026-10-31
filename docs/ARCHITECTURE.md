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
