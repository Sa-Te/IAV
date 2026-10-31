# 0009 — Every parsed category is viewable on-device

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** project owner
- **Relates to:** ADR 0001, ADR 0002, ADR 0008; AGENTS.md §1.7, §8

## Context

M8 gives every category that is present in the export a page at `/categories/:id`,
rendered generically from its shape (a table when the data carries labels, a raw
JSON tree otherwise). That includes the two message categories, the AI-conversation
file and the payment-information file — categories that contain words and records
written by, or about, people other than the reader.

AGENTS.md §1.7 requires an explicit privacy note before a feature surfaces messages
or other people's data. This is that note. Without it, "render everything" would be
a privacy decision taken by accident.

## Decision

1. **On this device only.** The view reads IndexedDB through the repository. It
   performs no network request, includes no remote asset, and sends nothing
   anywhere — the same invariant as the rest of the app (ADR 0001).
2. **Read-only.** There is no search, copy-all, share, download or export. Those
   are separate features and each needs its own note and its own ADR.
3. **No aggregation or highlighting.** The view shows the stored values with the
   export's own labels. It does not summarise, rank, or surface "interesting"
   messages, because that would be an interpretation of someone's words.
4. **The raw tree starts closed.** A category that cannot be read as a table opens
   as a collapsed JSON tree behind a banner stating that the data is stored exactly
   as provided and has not been interpreted. Nothing expands automatically.
5. **Privacy tier is a label, not a gate.** T5 rows are visible to whoever holds
   the device. The threat model is "a stranger's export, on the stranger's device",
   not a shared machine; a lock screen or per-tier unlock is out of scope for v1
   and would need an ADR.

## Options considered

1. **Do not render T5 categories at all.** Rejected for M8: the user's own messages
   are the point of an archive, and the app already stores them. Hiding them makes
   the data map dishonest ("72 categories, but 4 are invisible with no explanation")
   without reducing exposure — the records are already on the device.
2. **Render everything with no note.** Rejected: §1.7 exists because "we didn't
   think about it" is how third-party data ends up on a screen it should not be on.
3. **Render only categories with a dedicated parser.** Rejected for the same reason
   as (1), and it would leave ~55 categories with no way to look at their own data.

## Consequences

- Anyone with the device and the tab open can read messages, AI conversations and
  payment records. That is the owner of the export reading their own export; it is
  acceptable, and it is written down here rather than assumed.
- The `/categories` index names all 72 present categories, including the sensitive
  ones. The index shows counts only, never values.
- A future "share this category" or "search the archive" feature must extend this
  ADR or supersede it. It may not rely on this one.
- The three T5 rows that M7b registered as "no UI in v1" now render through this
  generic view; their registry comments say so. Bespoke UI for them is still not
  built, and is not planned in v1.
