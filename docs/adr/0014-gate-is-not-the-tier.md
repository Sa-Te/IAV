# 0014 — The reveal gate is a second axis, not a lower tier

- **Status:** Accepted
- **Date:** 2026-11-13
- **Deciders:** project owner
- **Relates to:** ADR 0009 (every category viewable; its reveal amendment),
  ADR 0011 (sidebar and tiers), `docs/DATA-MAP.md`, `docs/T3-DESIGN.md`

## Context

ADR 0009's amendment introduced the reveal gate for **tier 5** categories: text
written by other people. M22 measured T3 and found three categories that break the
equation "gated means tier 5":

- `post_comments` — 853 comments other people wrote on the reader's posts;
- `reels_comments` — 12 of the same, on reels;
- `liked_comments` — 156 comments the reader liked, with the account and a link.

Their *content* is third-party words, so a shared screen should not open into
them. Their *place* is T3: when the reader goes looking for their own comments,
that is where they look, next to their posts and saved posts. Burying them under
"Their words" would answer the privacy question and get the navigation question
wrong.

Two properties were conflated because until now they coincided:

1. **Whose data is this?** — the privacy tier, a label for ordering the work and
   the sidebar (ADR 0002, ADR 0011). T5 today means "text written by someone else".
2. **Must the screen ask first?** — the reveal gate (ADR 0009 amendment).

## Options considered

1. **Move the three comment categories to T5.** Consistent, cheap, and it makes
   `isT5` stay the gate. Rejected: the tier page is how a person finds their own
   content, and "Comments" under "Their words" reads as somebody else's inbox. It
   also changes a privacy *tier*, which is a data-classification statement, to solve
   a rendering problem.
2. **Gate every T3 category.** Rejected: 42,197 liked posts and a saved collection
   list do not contain a single word written by another person. A gate that fires
   everywhere trains the reader to click through it without reading.
3. **A `gated` flag on the registry row, independent of `privacyTier`.** Chosen.

## Decision

- `Category` gains `gated?: boolean`. It is set on `post_comments`,
  `liked_comments` and `reels_comments`. Their `privacyTier` stays 3.
- `isT5(id)` becomes `isGated(id)`: `privacyTier === 5 || gated === true`. The
  render layer asks one question and mounts one gate; it does not know the two
  reasons.
- The gate's copy names what is inside, in the reader's terms ("comments other
  people wrote on your posts, the account that wrote each one, and when").
- A row that is both T5 and gated still answers `true` once, so one gate mounts.
  No measured row is both today; a test asserts that so a future row cannot produce
  a nested double gate.
- Comments keep their T3 tier-page placement and their
  `/categories/post_comments` route. The gate is orthogonal to navigation.

## Consequences

- The registry now answers two different questions about a category. That is the
  point, and it is why `gated` is optional: most rows answer only the tier.
- `isT5` is gone. Any code that wants "is this tier 5" reads
  `findCategory(id)?.privacyTier`; the gate is `isGated`.
- A future category with third-party words in a low tier (a shared list, a
  forwarded post) sets `gated` and nothing else. A future category that is T5 for a
  non-text reason still gates by tier — which may then be wrong, and the fix is a
  new decision, not a silent exception.
- The reveal is still memory-only and per category (ADR 0009). The gate changes
  when the repository is read, never what is stored.
- `docs/DATA-MAP.md` keeps the T3 rows where they are and notes the flag. The
  completion tracker is about screens, not about how private a screen is.
