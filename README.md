# InstaVault

Turns an Instagram data export ZIP into a browsable gallery.

Instagram lets you download everything it holds about you as a ZIP full of JSON
files and media. There is no way to look at any of it. This project parses that
ZIP and shows it back to you.

## Status

**Pre-alpha. It does not work yet.** There is no application code in this
repository at the moment: the workspace is being rewritten and only the
documents, the licence and the frozen reference backend exist. Nothing here can
be installed or run.

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

Planned, not yet installed:

- Next.js 15 (App Router, static export), React 19, TypeScript in `strict` mode
- Tailwind CSS v4
- Zustand for UI state; zod for validating archive JSON
- IndexedDB for archive records and media blobs; a Web Worker for parsing
- Three.js / React Three Fiber for the optional 3D view
- Vitest for tests, pnpm as the only package manager

## Building it

Not available yet. When the workspace exists the entry points will be
`pnpm install`, `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm test` and
`pnpm lint` from the repository root. Until then there is nothing to run.

## Contributing

Read [AGENTS.md](AGENTS.md) first. It is the contract for every change, and it
is written for both humans and coding agents.

## Licence

AGPL-3.0. See [LICENSE](LICENSE). If you run a modified version as a network
service, section 13 of the licence requires you to offer its source.
