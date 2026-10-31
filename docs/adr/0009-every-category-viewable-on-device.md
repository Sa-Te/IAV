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

## Amendment — explicit reveal (2026-10-31, M9)

The Decision above said T5 content is visible on-device. It did not say under what
circumstances, and "the person who opened the tab" is not the same person as "the
person whose conversations are on screen". This amendment adds a gate rather than
changing the reasoning.

**Why.** The realistic exposure is a shared screen: a laptop on a desk, a demo in a
room, someone looking over a shoulder. Rendering a conversation because the route
was clicked makes a private message an accident of navigation.

**What is gated.** Every category whose registry `privacyTier` is 5, decided by
`isT5()` reading the registry — not by a list of ids in the view layer. Today that
is `messages_inbox`, `messages_requests`, `ai_conversations`,
`checkout_payment_information` and `threads_viewed`. T1–T4 are untouched.

**The gate defers the read, it does not hide rendered data.** The reading component
is not mounted until "Show this category" is clicked, so no repository call happens
before it. Hiding a rendered table with CSS would leave the data read and in memory,
which is a weaker property than it looks.

**Nothing is persisted.** The revealed set is module state, in memory only: no
`sessionStorage`, no `localStorage`, no IndexedDB. A page reload re-gates every
category. Within one page session a category that was revealed stays revealed,
including after its component unmounts and mounts again — otherwise every
navigation inside `/categories` would demand the same click again.

**What is still true from the Decision.** No search, share, copy-all or export; no
aggregation; the raw tree still starts closed; tier is a label, not a lock. A future
feature that remembers a reveal, or offers one, extends this amendment and does not
pretend to be covered by it.
