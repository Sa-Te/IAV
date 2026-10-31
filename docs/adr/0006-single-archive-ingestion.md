# 0006 — One archive per device and the ingestion policy

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** project owner
- **Relates to:** ADR 0001, ADR 0002, ADR 0005

## Context

The app holds **one** archive at a time: one person, their export, their device.
Instagram exports also differ in shape between accounts and over time, so the
importer is the first place that drift becomes visible to a user. That makes the
storage question and the drift question the same question.

Two things are fixed by earlier decisions: the archive lives in IndexedDB on the
device (ADR 0001), and a different shape is a warning, never an error (ADR 0005).

## Options considered

1. **Multiple archives co-hosted.** An `archiveId` on every record and every
   query, a picker in the UI, per-archive media deduplication. Rejected for v1:
   it doubles the schema surface of every store, and the product is "see *my*
   archive", not "compare my accounts". It also makes quota exhaustion far more
   likely, because media is stored per archive.
2. **One archive, replaced on import.** Chosen.

## Decision

**One archive per device.** Importing a new archive replaces the previous one.

Before anything is deleted, a **drift check** compares the new fingerprint
(ADR 0005) with the stored one and reports added, removed and changed
categories. The user sees what changed **while the old data still exists**, then
confirms a destructive replacement that names what will be deleted.

Two implementation choices belong to this decision:

- **`fflate` is the ZIP reader.** The platform's `DecompressionStream` can inflate
  a deflate stream but cannot read a ZIP archive: it has no notion of a central
  directory, entry names, or per-entry offsets. A ZIP reader needs all of that,
  so we take a small, MIT-licensed, dependency-free library rather than
  hand-rolling a parser for a format with several extensions we do not control.
- **Media blobs are stored during ingestion**, not lazily on first view. Lazy
  loading would leave the archive in a state where "imported" does not mean
  "usable", and the user would discover missing media one broken tile at a time —
  which is the failure this rewrite exists to remove. Storing eagerly also lets
  the importer report `mediaMissing` honestly at the end.

## Consequences

- **Replacing is destructive and must be confirmed.** The confirmation names what
  will be deleted. There is no undo.
- **A failed or cancelled import leaves no archive**, so the device never holds a
  half-imported one. Combined with the point above, a failed replacement loses
  the previous archive — accepted, and the reason the drift check runs first.
- **Quota exhaustion is a first-class failure state**, not an exception in the
  console: the job fails with `insufficient-space` and both numbers, before
  writing media.
- **A second archive can be compared, not co-hosted.** The fingerprint and drift
  report make comparison possible without storing two archives.
- **Media is keyed by its archive path**, not by archive id (there is only one
  archive). If multi-archive is ever wanted, that key and every query change —
  which is why this is an ADR and not a detail.
