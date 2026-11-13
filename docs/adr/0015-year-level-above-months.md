# 0015 — Long event lists get a year level above the months

- **Status:** Accepted
- **Date:** 2026-11-13
- **Deciders:** project owner
- **Relates to:** ADR 0013 (month/day grouping), ADR 0012 (bespoke per content),
  `docs/T3-DESIGN.md`, AGENTS.md §7 (performance), §8 (visual)

## Context

ADR 0013 made the month the fold. It was designed against T2's largest list,
`stories_viewed`: 7,849 entries in **one** month. A month list was enough because
the span was short — 31 day folds, one month button.

T3's largest list is different in kind, not just size. Measured from `archive-2/`
(`docs/T3-DESIGN.md` §4, §6):

| Category | Entries | Distinct months | Span (inclusive) |
| --- | ---: | ---: | ---: |
| `liked_posts` | 42,197 | 121 | **137 months** (2015-06 → 2026-10) |
| `saved_posts` | 1,065 | 94 | — |
| `post_comments` | 853 | 90 | — |
| `story_likes` | 311 | 43 | — |
| `suggested_profiles_viewed` (T2) | 1,784 | 41 | 44 months |
| `profile_activity` (T2) | 532 | 87 | 136 months |

One hundred and twenty-one month buttons is a scroll, not a jump target: the
question "what was I into in 2019" cannot be answered by scanning a list of 121
labels. The month fold is still right *inside* a year.

## Options considered

1. **Paginate the month list.** Cheapest, but pagination is for rows, not for a
   calendar; the reader still cannot jump to a year.
2. **A year filter (a select).** A control that filters is a different interaction
   from a fold, needs a "show all" state, and hides rows rather than revealing
   them — which conflicts with "nothing is hidden silently" (ADR 0013).
3. **Year fold above the month fold, only when the span is long.** Chosen.

## Decision

- `groupByMonthAndYear(entries)` lives in `packages/core/src/categories/eventListView.ts`.
  It returns the flat month list (newest first), the year groups (newest first,
  empty unless engaged), the inclusive `spanMonths`, and `showYears`.
- **The threshold is 25 months** (`YEAR_LEVEL_MIN_MONTHS`), i.e. it engages above
  24 months. Under 25 months the screen is byte-for-byte what ADR 0013 shipped:
  open the newest month, everything else closed.
- **Span counts empty months inside the range.** A person scrolling from 2015 to
  2026 wants the years even if three of them have one entry each.
- The newest year is open and its months are closed. Opening a year opens no month:
  guessing which month the reader wants would put a month of rows in the DOM for a
  click that only said "2019".
- All ADR 0013 caps carry over unchanged: 7 days per open month, 200 rows per day,
  200 undated rows. The caps are per open month, so the year level cannot multiply
  them.

## Consequences

- **Measured in the browser** against `archive-2/`: `liked_posts` renders 12 year
  rows covering 121 months; with every year collapsed the page is **367 DOM nodes**
  (53 inside the list) and zero rows. As rendered (newest year open, months closed)
  it is 409 nodes. The 2000-node ceiling from AGENTS §7 is not approached.
- `post_comments` behind its gate: 12 year rows, 853 entries, 6 month rows in the
  open year, zero rows until a month is opened.
- Two T2 categories now show the year level because their span crosses the
  threshold: `profile_activity` (12 years, 87 months, 532 entries) and
  `suggested_profiles_viewed` (5 years, 41 months, 1,784 entries). The other
  fourteen T2 lists are unchanged. That is the rule working, not an exception —
  T2's design assumed a short span and two of its categories did not have one.
- The threshold is a product value, not a measured optimum. It is one constant in
  core; changing it changes every screen at once, which is why it was chosen over a
  per-category flag.
- Deep-link-to-a-month is not supported (nothing is in the URL). If it is wanted,
  it is a routing decision, not a grouping one.
