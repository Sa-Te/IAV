# 0016 — The archive's presentation values are applied, not printed

- **Status:** Accepted
- **Date:** 2026-11-13
- **Deciders:** project owner
- **Relates to:** ADR 0009 (viewable on-device), ADR 0012 (bespoke per content),
  ADR 0013 (event list), AGENTS.md §6 (different layer, different abstraction),
  §8 (visual standards), `docs/T3-DESIGN.md` §3

## Context

Two T3 categories store how a thing looked, not just what it said:

- `emoji_sliders` — `Text colour` and `Background colour`, as hex strings
  (`#262626`, `#FFFFFF`);
- `polls` — `Option 1 font size` … `Option 4 font size` as numbers, and one
  `Colour` for the poll (`Black` in every measured entry).

The event row printed them as label/value fields. Reading a row aloud as
"Background colour: #FFFFFF" is the archive talking to itself: the person made a
slider, they did not ask what colour it was. The same for "Option 1 font size: 35"
and "Colour: Black".

The archive also keeps the *link to the story* inside a label-less container for
`story_reaction_sticker_reactions`, `questions` and `quizzes`. `labelValues.ts`
drops label-less containers on purpose (they are not labels), so the row showed the
emoji and not the thing it reacted to.

## Options considered

1. **Leave them as fields.** Honest and zero code, but three of the seven T3 screen
   defects the owner reported are this exact line of text. Rejected.
2. **Translate the values (a name→hex table, "small/medium/large" sizes).** Rejected:
   a colour name the export wrote is not a CSS colour, and mapping it would be an
   interpretation the reader cannot check. The export's own string is passed through.
3. **A dedicated card per sticker/poll inside the row.** Rejected: the row already
   has the hero, the date and the link; a card is a second layout for the same data.
   The preview is a bounded block inside the existing row.
4. **Apply the values in the row; read nested containers for a link.** Chosen.

## Decision

- `EventPreview` (core, `categories/eventPreview.ts`) is a discriminated union:
  `sticker` (emoji + text colour + background colour) or `poll` (colour + options
  with their sizes). It is built only for the two measured shapes; every other row
  keeps `preview: null`.
- The labels the preview shows are removed from the row's field list, so no value is
  printed twice and no hex or "font size" line survives.
- The renderer applies a colour with `style.backgroundColor` / `style.color` and
  validates nothing beyond length: React sets the property, the browser ignores an
  invalid value. A value is never interpolated into a CSS string. Each swatch and
  sticker carries the value in its accessible name, so a screen reader still hears
  what a sighted reader sees.
- Poll options render at their declared size, clamped to 12–40 px so a bad value
  cannot break the page.
- `nestedUrlOf` (core) is the one reader of label-less containers, and only to find
  the first absolute URL. That becomes the row's link when the entry has none of its
  own. Nothing is synthesised: no username is turned into a profile URL.

## Consequences

- A sticker row is now: date, the emoji on its own background, the question or
  caption, the story link. A poll row: date, question, options at their sizes, a
  colour swatch, the remaining fields (anonymous, type, expiry).
- Measured in the browser: emoji sliders show two sticker blocks with
  `rgb(255,255,255)` background and `rgb(38,38,38)` text; polls show options at
  35 px and a swatch named "Poll colour: Black"; the row text contains no `#`, no
  "font size" and no colour label.
- The link fallback makes questions and quizzes link to their story too. That was
  not requested and is the same rule; it is recorded because it changes those rows.
- A future export with a colour the browser does not understand shows a neutral
  block, not an error. The value is still in the raw JSON.
- Printing the value for a user who cannot see the colour would need a caption per
  swatch; the accessible name covers it for assistive technology, and the raw
  disclosure covers it for everyone.
