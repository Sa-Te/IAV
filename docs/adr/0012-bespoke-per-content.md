# 0012 — Bespoke per content, not bespoke per name

- **Status:** Accepted
- **Date:** 2026-11-13
- **Deciders:** project owner
- **Relates to:** ADR 0009 (every category viewable), ADR 0011 (sidebar and tiers),
  AGENTS.md §8, §16

## Context

M20's report was blunt: T1 categories "all i see is a table, displayed we need to
plan somehow to display it great according to the content it will display". The
generic table was not wrong about the data; it was the wrong shape for it. A
label/value envelope became a row of columns, nested lists became blank cells,
`timestamp_value` disappeared, and a single-entry category read as "1 entries".

The obvious fixes are both bad. One screen per category id means 86 screens and
86 chances to disagree. One better table still cannot show a nested list, an
opaque token and a bare label as three different things without becoming a
schema of its own.

The useful question is not "what is this category called" but "what does its
record actually contain". That question can be answered by a probe before any
screen is written, and it produces a smaller number of groups.

## Options considered

1. **One bespoke screen per category id.** Rejected: 86 screens, most of them
   near-duplicates, and the next export changes a shape and the screen lies.
2. **Improve the generic table.** Rejected: a table is a flat grid. Nested lists,
   timestamps, descriptions, bare labels and opaque values are not columns.
3. **Measure each category's content, group the groups, and write one screen per
   group.** Chosen.
4. **Detect the shape at runtime for every tier at once.** Rejected for M20: it
   would change T2–T5 views that have not been measured, and a screen chosen
   without evidence is the thing this ADR exists to prevent.

## Decision

- **A screen is chosen by content within a tier.** The T1 probe
  (`docs/T1-DESIGN.md`) measured twelve present categories and found three
  groups: ten label/value records, thirteen avatar records with no label layer,
  and thirty repeated records of one device. The first group shares one settings
  screen; the other two get their own.
- **Sharing a screen is a finding, not a compromise.** The ten settings
  categories differ in field count and entry count, which the screen handles as
  data. They do not differ in kind.
- **The id checks are the measured exceptions, not the rule.** `CategoryView`
  asks core for a settings/avatar/device view; a record that does not match the
  expected shape returns `null` and falls back to the generic table or tree. The
  screen never claims a shape it did not read.
- **Repeated records are deduplicated only when they are identical.** The device
  screen groups by identity and shows one profile when every record under it is
  the same. If one identity carries different profiles, core refuses and the
  settings screen shows every record.
- **A new category joins a group after a probe.** The probe records key names,
  types, counts and shapes, never values, and the result goes into the design
  document before the screen. No category is assigned by its name.

## Consequences

- The T1 screens are falsifiable: a changed export makes a view return `null` and
  the app degrades to the table or tree rather than showing a confident lie.
- Two categories sharing a screen must be reported as a measurement result. The
  next reader can check the probe instead of trusting the grouping.
- T2–T5 are **not** converted by this decision. Each needs its own measurement;
  the projection in `docs/T1-DESIGN.md` §6 says only three of the remaining 60
  present categories look like T1 settings, so copying this screen across the
  archive would be the wrong kind of reuse.
- The screens reuse the existing tokens and the four `State` states. No new
  dependency, no new colour, no gradient.
- A future "category screen" framework is still not justified: two similar
  parsers are cheaper than one clever one (AGENTS.md §4).
