# 0011 — A persistent sidebar, and tiers as the way in

- **Status:** Accepted
- **Date:** 2026-11-13
- **Deciders:** project owner
- **Relates to:** ADR 0002 (category resolution), AGENTS §8

## Context

M17's report said it plainly: "i dont like this UI display [all categories], no
people would go and look into it like this". `/categories` was a table of 86 rows,
and the top nav offered five links with no home for the rest. Meanwhile the
cyclone needs the whole viewport, which a header row steals from every route.

## Options considered

1. **Keep the top nav, add a category dropdown.** Cheapest, but a dropdown is a
   menu to dismiss, not a place you are; and the header still costs height above a
   full-bleed view.
2. **A persistent sidebar with every category listed.** 86 links open at once is
   a directory, not navigation.
3. **A persistent sidebar: galleries, then the five tiers as disclosures, each
   opening to its own page of category cards.** Chosen.

## Decision

- The sidebar is the app's navigation on every route: wordmark, Galleries
  (Everything, Posts, Stories, Archived, Cyclone) with counts, then T1–T5 as
  `<button>` disclosures with `aria-expanded`/`aria-controls` and a count of
  present categories, then the on-device line.
- The tier that owns the current route opens by itself; the current route is the
  one filled item and carries `aria-current="page"`.
- `/tiers/t1` … `/tiers/t5` are pages of category cards. Present categories are
  links, absent ones are muted and are not links, and they sit in their own group
  under "Not in this export (n)" — absence is a normal state (ADR 0002), but it
  is never interleaved with what the person has.
- `/categories` becomes an overview of the five tiers that links to those pages.
  It is not deleted: `/categories/:id` is unchanged and everything links there.
- Under 900px the sidebar is a modal sheet: Menu opens it, Tab is trapped, Escape
  closes it, focus returns to the button, `inert` while closed.

## Consequences

- The shell has one landmark fewer: there is no header banner any more. Tests that
  asserted a banner were updated; the sidebar is one complementary landmark with
  two named navigations inside it.
- A full-bleed route subtracts `--token-layout-sidebar`, not a header height.
- The disclosure state is local to the sidebar; nothing is persisted. A reload
  reopens the group for the current route and nothing else, which is enough.
- The tier names ("Settings & mechanics", "Their words") are product copy, kept in
  one module (`categories/useCategoryRows.ts`) so the sidebar, the tier pages and
  the overview cannot disagree.
