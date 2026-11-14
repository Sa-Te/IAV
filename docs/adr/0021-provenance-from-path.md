# 0021 — Message media provenance comes from the path

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** project owner
- **Relates to:** ADR 0009 (viewable on device), ADR 0020 (network rule),
  `docs/T5-DESIGN.md` §4

## Context

The unified gallery (`/`) includes message attachments. A photo in that grid is
otherwise anonymous: the repository key is its archive path, but the tile showed
only a caption and a category string. The reader could not tell which conversation
a photo came from, and a click had no way back to that conversation.

The path already contains the answer:

```
your_instagram_activity/messages/<family>/<thread>/<kind>/<filename>
```

Measured on `archive-2/`: **103 of 103** message media URIs contain the thread
folder that owns the message (0 under another thread). Category media has a second
stable shape, `media/<categoryId>/<YYYYMM>/<filename>`.

The question was whether to store provenance when the archive is imported or
derive it when the media is displayed.

## Decision

`mediaProvenance(path)` is a pure core function and returns one of two shapes:

- `{ kind: "message", family: "inbox" | "message_requests", threadFolder, filename }`
  for a path under `messages/`;
- `{ kind: "category", categoryId }` for a path under `media/`, with
  `"unrecognised"` when neither shape matches.

The gallery and the detail view derive provenance from `MediaItemView.id` at
render time. **No IndexedDB field is added and no import migration is needed.**
A message tile shows `from messages · <family> · <threadFolder>` and links to
`/categories/messages_inbox#<family>/<threadFolder>` (or `messages_requests`).
The thread list opens by hash after the reveal gate.

There is no invented thread name. The folder is the thread's identity in the
export; if participants are not resolved at that point, the folder is shown rather
than a guess. A category path returns the category branch and the view shows
nothing extra, because "from stories" is already the gallery's own context.

## Options considered

1. **Store `threadId` on every media record at import.** Rejected: it is a second
   copy of information already in the primary key, it needs a migration for every
   existing archive, and it can drift from the path. D5 says no new stored field.
2. **Resolve participants at tile render and show a name.** Rejected for the
   generic tile: the gallery would need every thread record in memory just to
   label a photo, and a participant list is not stable across exports. The folder
   is the honest identifier; the conversation view has the names.
3. **Do nothing; leave the tile anonymous.** Rejected: a message photo in `/` is
   indistinguishable from a post, and the reader cannot get back to the message.
4. **Parse the path in the view.** Rejected: the knowledge would then live in two
   views (gallery and detail) and could disagree. The parse is core, tested once.

## Consequences

- A media item can be traced to a conversation with no storage change and no
  re-import.
- The path shape is now a small contract. If a future export moves message media
  out of its thread folder, `mediaProvenance` returns the category branch (or
  `unrecognised`) rather than a confident wrong thread; the test names the
  measured shape so the failure is visible.
- The provenance link opens a gated category. It does not bypass the gate: the
  reader still clicks "Show this category" on a fresh page, and the thread opens
  after the reveal.
- Category media remains labelled by its gallery, not by a second provenance line;
  the function still answers with the category branch for callers that need it.
