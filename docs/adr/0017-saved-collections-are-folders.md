# 0017 — Saved collections are folders, and their posts are nested

- **Status:** Accepted
- **Date:** 2026-11-13
- **Deciders:** project owner
- **Relates to:** ADR 0009, ADR 0012, ADR 0016, `docs/T3-DESIGN.md` §4,
  `docs/archive-manifest.md` §11 Q18

## Context

M22's measurement of Q18 concluded that no link exists between `saved_posts` and
`saved_collections`, because no `fbid` from one file appears in the other. The
owner asked for saved posts to be shown by their folders, and the request exposed
the error: **each collection embeds its saved posts as full records** inside a
label-less container. The membership was never missing; it was nested one level
below what the string scan looked at.

Measured across `archive-2/`'s eight collections: 356 nested post records (355
distinct URLs), 329 of which also occur in the flat 1,065-entry `saved_posts.json`;
27 nested records have no flat counterpart; 736 saved posts are in no collection.

## Options considered

1. **Leave the two screens as event lists.** Defensible only before the nesting was
   known. It answers "when did I save this" and never "which folder is this in".
2. **Match by `fbid`.** There is no shared `fbid`; the collection's nested records
   carry a `URL`, not an id.
3. **Show a folder field per saved post, keeping the flat list.** Cheaper, but it
   hides the fact that 736 posts are in no folder and turns a folder into a column.
4. **Each collection is a folder listing the posts it embeds; the flat list is
   grouped by the same folders, joined by URL, with the remainder explicit.**
   Chosen.

## Decision

- `toSavedCollectionsView` (core) reads collections as folders: name, type,
  privacy, update time, and the nested post records.
- `toSavedPostsByFolder` (core) takes the flat saved list plus those folders and
  returns the same folders with dates joined **by URL**, and a `loose` list for
  posts no collection claims. URL is the identity, the same rule `posts` uses for
  its media URI.
- A post listed in two collections appears in both (measured once); it is not also
  loose.
- `saved_collections` renders folders only. `saved_posts` renders the same folders
  plus "Not in a collection". Both read the other file through the repository; a
  missing or unreadable sibling degrades to what the record in hand can show, and
  `saved_posts` with no collection file at all keeps the event list it had.
- A folder is a native `<details>`, first one open, 200 posts at a time. The
  uncollected group opens too, because it is the majority and hiding it would make
  the screen look complete when it is not.

## Consequences

- The two screens now answer different questions from the same data: folder /
  collection on one, "everything I saved, by folder" on the other.
- The collections screen depends on `saved_posts` for dates and the saved-posts
  screen depends on `saved_collections` for folders. Both are optional reads: no
  new storage, no new index, no server.
- The Q18 answer is withdrawn and replaced in `docs/archive-manifest.md` §11 and
  `docs/T3-DESIGN.md` §4. The first measurement compared strings across files; the
  correct one parses nested records. That distinction is the lesson, not the count.
- A future export that keys membership by id instead of nesting is a new
  measurement; the view falls back to the flat list when the collections file is
  absent, so it cannot break.
- The 27 nested posts with no flat entry keep no date. They are still shown in
  their folder, because the collection says they are there.
