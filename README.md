# InstaVault

Turns an Instagram data export ZIP into a browsable gallery.

Instagram lets you download everything it holds about you as a ZIP full of JSON
files and media. There is no way to look at any of it. This project parses that
ZIP and shows it back to you.

## Status

**Pre-alpha. It does not work yet.** The workspace, build pipeline and the
category resolver exist; there is no archive parsing and no gallery. You can run
the build and see one placeholder page.

## What v1 is

v1 is designed to be a **browser-only, static web app**:

- no server and no backend process;
- no accounts, no sign-in, no database;
- the ZIP is opened and parsed in a Web Worker inside the tab, and the extracted
  records and media are stored in IndexedDB on your device;
- nothing is uploaded, and the build contains no analytics, telemetry, remote
  fonts or runtime CDN assets.

This is the design recorded in [AGENTS.md](AGENTS.md) §1 and
[docs/adr/0001-browser-only-v1.md](docs/adr/0001-browser-only-v1.md). It is a
specification for work that has not happened yet, not a description of current
behaviour. The previously shipped version was a Go + Postgres app that uploaded
the whole archive to a server; it is kept, unmodified and unbuilt, in
`reference-backend/` as a specification for what an Instagram export contains.

## Stack

Installed:

- Vite + React 19 + react-router-dom, TypeScript in `strict` mode
  (ADR [0004](docs/adr/0004-vite-not-nextjs.md); Next.js appears only in
  `reference-frontend/` and is never imported)
- Zustand for UI state; zod for validating archive JSON (planned, not yet used)
- IndexedDB for archive records and media blobs; a Web Worker for parsing
  (interfaces only so far)
- Three.js / React Three Fiber for the optional 3D view (planned)
- Vitest for tests, pnpm as the only package manager

## Building it

Requires Node 22 (see `.nvmrc`) and pnpm.

```bash
pnpm install        # also installs the pre-push hook
pnpm dev            # Vite dev server
pnpm build          # static build in apps/web/dist
pnpm test           # unit + integration tests
pnpm verify         # everything CI runs, locally
```

## Local gates

The repository enforces its own rules; they are not conventions to remember.

- **Pre-push hook** (`.githooks/pre-push`, installed by `pnpm install` through
  `git config core.hooksPath .githooks`): runs the fast lane — `typecheck`,
  `lint`, `test` — and blocks the push, naming the step that failed. Bypassing
  it with `--no-verify` to get past a real failure is the wrong move; if it is
  too slow, cut scope instead.
- **`pnpm check:boundaries`** fails if `packages/core` or `packages/storage`
  import React, reach into `apps/`, touch the network, or escape their package.
- **`pnpm check:filesize`** warns above 250 lines and fails above 400.
- **`pnpm verify`** runs the full suite that CI runs.

## Contributing

Read [AGENTS.md](AGENTS.md) first. It is the contract for every change, and it
is written for both humans and coding agents.

## Licence

AGPL-3.0. See [LICENSE](LICENSE). If you run a modified version as a network
service, section 13 of the licence requires you to offer its source.
