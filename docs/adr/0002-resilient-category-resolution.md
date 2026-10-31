# 0002 — Resilient category resolution

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** project owner
- **Relates to:** M2 inventory (`docs/archive-manifest.md`), `docs/ARCHIVE-VARIANTS.md`

## Context

The M2 inventory described **one** export: 74 categories, 326 JSON files, a
known folder layout. It is one sample of a format that Instagram changes
quietly and per-account. Between two exports the following can all differ:

- folder prefixes — `your_instagram_activity/` present, absent, or renamed
  (a `content/` wrapper has been seen in other tools' reports);
- filenames — `posts_1.json`, `posts.json`, `posts_2.json`, `posts (1).json`;
- the numeric suffix style — `_1`, `_2`, ` (1)`, none, several parts;
- letter case — `Posts_1.json` vs `posts_1.json`;
- JSON versus the HTML twin variant of the same export;
- which categories exist at all.

The last point is not hypothetical. The old `CLAUDE.md` assumed 5 categories
that are **absent** from the M2 export: recently deleted, guide posts, autofill
information, shopping history, and ads *clicked*. A resolver that hard-codes
paths would have treated five missing directories as five failures.

The frozen Go backend resolved files by exact path suffix
(`strings.HasSuffix(path, suffix)` in `processorMap`), which is why adding a
suffix style meant editing code.

## Decision

**Matching never uses an exact path.** Resolution is three tiers, tried in
priority order:

1. **Basename regex** — matched against the file's basename, case-insensitive,
   with the numeric suffix optional. `posts_1.json`, `Posts_12.json` and
   `posts.json` all match the same rule.
2. **Structural signature** — when no name rule matches, the file is identified
   by the key-set of its top-level array elements (e.g. a root array whose
   elements have `{media, title}` is a post list). This is the tier that
   survives a rename.
3. **Unrecognised bucket** — anything still unmatched is parsed generically:
   it is kept, shown to the user as "unrecognised data", and never dropped.

The registry is **data, not code**: one table entry per category carrying its
name rule, its structural signature, its schema reference and its view. Adding
a category is one row.

### Message threads

254 files share the basename `message_1.json`; they are distinguished **only by
their parent folder**. The resolver therefore treats the parent folder as part
of the key:

- The thread family is determined by the **nearest ancestor directory whose
  normalised basename is `inbox` or `message_requests`**, searched upward from
  the file, not at a fixed depth. Case is ignored.
- The thread identity is the normalised **relative path** of the file from the
  archive root (its `thread_path`), not the basename. Two threads may not
  collapse into one.
- If the folder name is neither, tier 2 decides: a thread object carrying
  `is_pending` / `joinable_mode` is a message request; one with
  `is_still_participant` and no `is_pending` is an inbox thread.
- A thread file that cannot be placed by either tier goes to the unrecognised
  bucket **as a thread**, not as a generic file — messages are never dumped into
  a "miscellaneous" list that the user might mistake for junk.

## Options considered

1. **Exact path suffix matching** (the Go approach). Rejected: it is the thing
   that breaks when Instagram renames anything, and it cannot express "this
   category is simply not in this export".
2. **Basename matching only.** Rejected: a rename defeats it, and `posts.json`
   appears in more than one folder in some variants.
3. **Structure only (no names).** Rejected: many categories have identical or
   near-identical shapes (`posts` vs `archived_posts`, `followers` vs
   `following`), so structure alone is ambiguous.
4. **Names first, structure second, bucket last.** Chosen — cheapest match
   wins, and the expensive tier only runs when it must.

## Consequences

- **Absence is normal.** A category that is not in the export resolves to
  "not in this export", which is a *state*, not an error. No view may treat it
  as a failure, and no log line may call it a warning.
- **Every category needs two things**: a name rule *and* a structural signature,
  or tier 2 cannot work when tier 1 misses. A category shipped with only a name
  rule is incomplete.
- **Ambiguity is a hard error.** If one file matches two rules, resolution fails
  loudly with both rules named. It is never resolved by "first match wins",
  because a coin flip on someone's personal data is worse than a refusal.
- **The unrecognised bucket is a feature, not a gap.** Unknown data is parsed
  generically, stored, and surfaced. AGENTS.md §6 already requires that nothing
  is silently dropped; this is how that requirement is met at file level.
- **Resolution is testable without the real archive.** The registry is data, so
  tests can feed invented paths and invented shapes. No fixture needs personal
  data.
- **Two categories carry a naming hazard that no tier fixes**: two filenames
  contain an apostrophe (`follow_requests_you've_received.json`,
  `posts_you're_not_interested_in.json`). Apostrophes appear in shell quoting,
  archives and URLs differently; the name rule must be written for the raw
  basename, not for a quoted or URL-encoded form.
