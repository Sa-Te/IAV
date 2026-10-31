# 0001 — Browser-only v1

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** project owner

## Context

The shipped application (preserved in `reference-backend/`, formerly `backend/`)
was a Go service with PostgreSQL that accepted the user's whole Instagram export
as a multipart upload, unzipped it to the server's disk, parsed it server-side
and stored extracted records in the database. The browser then fetched records
and media back one blob at a time. The front page simultaneously claimed
"Runs locally. Your data never leaves your machine."

That is a false privacy claim, and it is the claim the product is built on. It
also produced the class of failure the project is named after: media tiles that
rendered a loading placeholder forever because a media request returned an error
that nothing surfaced.

At the same time the Go code contains the real knowledge of the export format —
`processorMap` maps every archive JSON filename to a parser, and
`processors_test.go` exercises those parsers against a real export.

Separately, sync across devices was raised as a possible feature. End-to-end
encrypted sync is a substantial design effort on its own and would force key
management, server infrastructure and a privacy story for the sync server.

## Options considered

1. **Server-hosted.** Keep Go + Postgres, fix the copy to say the archive is
   processed by a server you run yourself. Cheapest to ship because the parsing
   already works. Rejected: the product promise is "nothing leaves the device",
   donations depend on that promise, and a self-hosted server means every user
   runs a database.
2. **Browser-only.** Parse in a Web Worker, store in IndexedDB, ship a static
   site with no server and no accounts. Requires rewriting the parse layer in
   TypeScript. Chosen.
3. **Full E2EE in v1.** Browser-only plus encrypted cross-device sync. Rejected
   for v1: it delays the only thing that matters (a working local gallery) and
   needs a sync service, which reintroduces the infrastructure decision.

## Decision

v1 is browser-only: no server, no accounts, no database, no network egress. The
archive is parsed in a Web Worker and stored in IndexedDB on the user's device.

The Go implementation is **frozen and renamed** to `reference-backend/`. It is
read as a specification of the Instagram export format and is never built,
executed or shipped in v1. It is excluded from CI.

E2EE sync is deferred to v2. Nothing is built toward it beyond the
`ArchiveRepository` seam that makes a second storage implementation possible
(AGENTS.md §2, §17).

## Consequences

- **The parse layer is rewritten in TypeScript** (`packages/core`), one parser
  and one zod schema per archive category. This is the bulk of v1's work.
- **The Go test suite is kept as an oracle.** `processors_test.go` encodes
  expected field names and shapes for the categories it covers. Those
  expectations become the fixtures and assertions for the TypeScript parsers.
  It is a reference, not a dependency: v1 does not run Go in CI.
- **No GDPR controller role in v1.** The operator does not receive personal
  data, so there is nothing to be a controller of. Hosting a static bundle
  contains no user data.
- **Offline/Tauri wrapper remains possible.** The render and parse layers stay
  independent of the network and of the storage backend, so a desktop build is a
  thin wrapper around the same code rather than a fork.
- **No server-side search, aggregation or thumbnailing.** All of it must run on
  the device within the performance budgets in AGENTS.md §7.
- **The `archive/` folder on the author's machine is test data only.** It is
  gitignored and is never copied into fixtures; fixtures are synthetic or
  redacted (AGENTS.md §1.6).
