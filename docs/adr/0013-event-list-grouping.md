# 0013 — The event/activity list groups by month, then day

- **Status:** Accepted
- **Date:** 2026-11-13
- **Deciders:** project owner
- **Relates to:** ADR 0009 (every category viewable), ADR 0012 (bespoke per
  content), `docs/T2-DESIGN.md`, AGENTS.md §7 (performance), §8 (visual)

## Context

Sixteen present T2 categories are dated event/activity lists. The largest,
`stories_viewed`, is 7,849 entries in one month; `profile_activity` is 532,
`login_activity` 103, `profile_status_changes` 54. A table is the wrong shape:
the row is a caption or a field list, not a column grid. A flat list is the other
wrong shape: 7,849 rows in the DOM is a scrolling and rendering problem, and the
first thing a person wants is "what happened recently", not "here is every row".

The measured data also says the date is not always an envelope `timestamp`.
`login_activity`, `logout_activity`, `profile_changes` and `signup_details` put
it in a `string_map_data` object whose `value` is empty and whose `timestamp`
beside it is the date. The reader must prefer the timestamp when the value is
empty.

## Options considered

1. **A table with a date column.** Rejected: it flattens captions and nested
   details, and 7,849 rows is a page-count problem with no hierarchy.
2. **A flat list, paginated at 200.** Better, but it loses the month/day shape
   the data actually has, and a person cannot jump to "last October".
3. **Month button → day heading → row, with the newest month open.** Chosen.
4. **Virtualise the whole list.** Rejected for M21: the data is already grouped,
   and a windowed list would need a measurement that this screen does not have.

## Decision

- **Month is the fold.** Each month is a `<button aria-expanded>` reading
  "October 2026 · 31 days · 7,849 entries". Only the newest month starts open;
  a closed month renders its button and nothing else.
- **Day is the second fold.** An open month shows **seven days at a time**, with
  a "Show 7 more days" button. A day with more than **200 entries** adds 200 rows
  at a time. The undated list uses the same 200-row cap.
- **The row** shows the localised date and time, the measured hero (caption,
  title, name, search, changed or activation type), the remaining fields as a
  compact labelled list, and a URL as a real link with its Instagram shortcode
  in mono. The app never fetches the URL; the image is not in the export.
- **No invented hero.** If a category has no caption-like label, the row is the
  plain field list. `profile_activity` and `your_ownership_of_digital_items` are
  the measured examples.
- **No timestamps at all** falls back to a plain list and says so.
- **The raw JSON** stays behind a closed disclosure, as on the settings screen.

The seven-day cap is an addition to the brief's day-level cap, and the
measurement is why: `stories_viewed` has 31 days in one month. Seven days keeps
the default render bounded while still showing a week of history.

## Consequences

- The real `stories_viewed` record measured before the caps: **5,308 rows /
  33,637 DOM nodes** in the default render (one month, 31 days). After the caps:
  **1,032 rows / 6,380 nodes**; every month collapsed is **184 nodes / 0 rows**.
  The first row is visible **1.1 s** from navigation in the local build.
- The month button always reports the full count, even when its panel is capped;
  the "Showing X of Y" status says what is rendered. Nothing is hidden silently.
- One component serves sixteen categories. The hero/date mapping is the measured
  priority in `docs/T2-DESIGN.md` §3, not a per-category screen.
- The next tier can reuse the screen only after its own measurement. The hero
  priority is a hypothesis until a category's labels are read.
- The 200-row day cap and the 7-day month cap are UI limits, not data limits; the
  raw JSON and the full month count remain available.
