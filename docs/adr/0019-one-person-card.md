# 0019 — One person card for all of T4, and only contacts gate

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** project owner
- **Relates to:** ADR 0009 (every category viewable; its reveal amendment),
  ADR 0014 (gate is not the tier), ADR 0018 (follow requests are two lists),
  `docs/T4-DESIGN.md`

## Context

T4 has fourteen present rows after ADR 0018's split. The measurement
(`docs/T4-DESIGN.md`) shows three different things inside the tier:

- twelve rows describe a person, with a date;
- `following_hashtags` describes a topic;
- `synced_contacts` describes an address-book entry with a phone number or an
  email address and no username.

The person rows come in four entry shapes: label/value envelopes, follower
`string_list_data`, following `title` + `string_list_data`, and Threads
`string_list_data`. Without a shared reader, four screens would each map the same
five concepts by hand. With a shared card, the mapping is measured once and every
person row gets the same presentation.

## Decision

1. **One person card and one list serve the twelve person rows.** The card shows
   initials, a display name, a username, the date the export records, and the
   profile URL when the export carries one. The list groups by year, newest first,
   sorts alphabetically inside a year, and renders 200 cards at a time. A row whose
   entry has no username is not a person: it returns the non-person branch instead
   of inventing a name.

2. **There is no avatar.** The export contains no profile images. The card does not
   hotlink an avatar, does not generate one, and does not hash a name to a colour.
   Initials are a text glyph on a token surface. A card with no picture is the
   honest card.

3. **The profile link is the export's URL or nothing.** Follower, following and
   Threads entries carry a real profile URL; those are shown with
   `rel="noreferrer noopener"` and `target="_blank"`, user-initiated. The `URL`
   label in the nine label/value interaction rows is **not** a profile URL (0 of 87
   entries in the baseline); it is empty or a personal website, so that card shows
   no link. The app never fetches a link and never constructs an Instagram URL from
   a username.

4. **Only `synced_contacts` gates.** Followers and following are the reader's own
   public relationships with public accounts; a screen showing them is the reader
   looking at their own network. A synced contact is different: a name and a phone
   number or email address belonging to someone who has not necessarily used
   Instagram and did not choose this app. The gate names that precisely, and the
   repository is not read before the reveal (ADR 0009's amendment). The flag is
   `gated: true` on a T4 row, independent of the tier (ADR 0014).

5. **A hashtag is not a person.** `following_hashtags` keeps a tag list: the tag,
   its page URL and its date. The person card is not used, because initials for a
   topic are noise and a "username" for a tag would be a category error.

6. **A contact is not a person card either.** `synced_contacts` keeps the table,
   which is what its `string_map_data` labels already produce, behind the gate. It
   has no username and no profile URL; the contact value is the content.

## Options considered

1. **A screen per entry shape.** Rejected: four readers of the same five concepts.
   The shapes differ; the card does not.
2. **A person row on the event list.** Rejected: the event list groups by day and
   hero, and a person list is a directory. The year fold is shared, the day fold is
   not.
3. **A generated avatar from initials and a colour hash.** Rejected by D4 and by
   AGENTS §8: it is an image the export does not contain, and a hash gives a person
   a colour they did not choose. A monogram on a token surface is not a portrait.
4. **Constructing `instagram.com/<username>` for every card.** Rejected: it is an
   outbound URL the export did not provide, and the username may be stale or
   renamed. The export's own `href` is the link, or there is none.
5. **Gating followers/following too.** Rejected: it would train the reader to click
   through a gate for their own public network. The threat model is a shared screen,
   and who follows the reader is not the same exposure as an address book.

## Consequences

- One core mapper (`categories/personView.ts`) and one card/list pair
  (`apps/web/src/people/`) serve twelve rows. A future person-shaped category adds
  its id to `PERSON_CATEGORY_IDS` and its shape to `toPerson`; it does not add a
  screen.
- The card cannot show a profile picture, and a label/value person row cannot show a
  profile link, because the archive has neither. Raw JSON keeps whatever was there.
- `synced_contacts` is the first gated T4 row. The gate's copy is a privacy
  statement, not a warning: it names the address book, the phone numbers and the
  email addresses, and the fact that those people may not use Instagram.
- T4 has no search or filter yet. Following is 3,362 people; the year fold and the
  200-row page make it scannable, but search is still deferred (AGENTS §17).
