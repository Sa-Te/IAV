# 0018 — Follow requests are two lists, not one

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** project owner
- **Relates to:** ADR 0002 (resilient resolution), ADR 0008 (multiple
  signatures), `docs/T4-DESIGN.md` §6

## Context

One basename, `follow_requests_you've_received.json`, appears twice in the
baseline export:

- `connections/followers_and_following/` — an array of label/value envelopes
  (`Name`, `Username`, `URL`, `timestamp`), 14 entries;
- `your_instagram_activity/threads/` — an object with a
  `text_post_app_text_post_app_follow_requests_received` wrapper and
  `string_list_data` entries, 15 entries.

Since M7b one registry row claimed both files. Ingest merged them into one
payload and the sidebar showed `29` — the sum of two unrelated lists. The M7b
report called "two apps' files in one row" an open question and left it there.

## Measurement (M23)

The probe extracted the person identifiers from both files and compared them
case-insensitively:

| Measure | Count |
| --- | ---: |
| Named in both files | **0** |
| Only in `connections/` | 14 |
| Only in `threads/` | 15 |
| Total | 29 |

The two sets are **disjoint**. They are two apps' follow requests: Instagram
records an Instagram relationship in `connections/`, Threads records a Threads
relationship in `your_instagram_activity/threads/`. They share neither a person
nor a profile host (`instagram.com` vs `threads.com`).

## Decision

Split the row:

- `follow_requests_you've_received` keeps the `connections/` file, label
  "Follow requests received", and the Instagram label/value signature.
- `threads_follow_requests_received` is new, label "Threads follow requests",
  and carries the Threads wrapper signature.

Both rows declare `parentSegment`; the basename alone is now deliberately
ambiguous and resolves to neither row. This is the same mechanism ADR 0002 uses
for the 254 `message_1.json` threads: when one name describes two things, the
parent folder is part of the key. The resolver never guesses from shape here,
because the two files' shapes are different but either could be produced by a
future rename.

The sidebar's T4 present count goes from 13 to 14. That is the honest count of
distinct lists, not a counting defect: before the split the screen claimed one
list of 29 that did not exist.

## Options considered

1. **Keep one merged row.** Rejected: the screen would present Instagram and
   Threads requests as one list, and the measured overlap is zero. A reader
   cannot tell which app a row came from.
2. **Split by structural signature only (no parent folder).** Rejected: tier 2
   would have to choose between two shapes, and a future export that normalises
   one app's shape would silently re-merge them. The folder is the stable part.
3. **Two rows with the same id and a discriminator field.** Rejected: ids are
   the repository key and the route; two rows cannot share one.
4. **Two rows, parent-folder match.** Chosen.

## Consequences

- Ingest stores two records instead of one merged record. The old merged-payload
  test now asserts two rows, each with one source.
- The M7b "two apps' files may share one row" question is answered: they may not.
- `docs/DATA-MAP.md` gains one row; the inventory count moves from 87 to 88
  registered categories, 73 of them present in the baseline.
- The same pattern applies to any future basename collision: the folder is the
  key, and the row that shares a filename declares it explicitly.
