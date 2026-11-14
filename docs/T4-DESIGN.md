# T4 — what the thirteen present categories actually contain

Measured from `archive-2/` on 2026-11-14 (M23), before any T4 screen was
designed. This document is the evidence for the person screen, the split of the
follow-requests collision, the field mapping and the screen assignment. It
contains key names, label strings, types, counts and shapes only: no personal
value is reproduced. Usernames, display names, phone numbers and email addresses
were read by the probe and never written here.

The probe ran the same ingest path the app runs over all 742 files, then read
every T4 category's entries. Counts are the app's own entry counts, not a second
opinion. The 13 rows below are exactly the rows the sidebar shows as present;
`secret_conversations` is the one T4 row absent from this export.

## 1. The thirteen present rows, plus the one absent

| Category | Display name | Entries | Files |
| --- | --- | ---: | ---: |
| `removed_suggestions` | Dismissed suggestions | 1 | 1 |
| `restricted_profiles` | Restricted profiles | 3 | 1 |
| `hide_story_from` | Hidden from story | 4 | 1 |
| `close_friends` | Close friends | 8 | 1 |
| `recent_follow_requests` | Permanent follow requests | 5 | 1 |
| `follow_requests_you've_received` | Follow requests received | 29 | 2 |
| `recently_unfollowed_profiles` | Recently unfollowed | 20 | 1 |
| `blocked_profiles` | Blocked profiles | 9 | 1 |
| `following_hashtags` | Following hashtags | 13 | 1 |
| `pending_follow_requests` | Follow requests sent | 23 | 1 |
| `followers` | Followers | 325 | 1 |
| `synced_contacts` | Synced contacts | 881 | 1 |
| `following` | Following | 3,362 | 1 |
| `secret_conversations` | Secret conversations | **0** | 0 — absent |

The sidebar counts are the app's counts. Following 3,362, Followers 325 and
Synced contacts 881 match the counts the user sees. Follow requests received is
29 because one registry row currently merges two files (14 + 15); §6 splits it.

## 2. The five entry shapes

### 2.1 The label/value interaction entry — nine rows

Eight categories and the `connections/` half of the ninth share one shape:

```
[ { fbid, timestamp, media: [], label_values: [
      { label: "URL",      value },
      { label: "Name",     value },
      { label: "Username", value }
  ] } ]
```

| Category | Entries | Labels, verbatim | Date field | Username field |
| --- | ---: | --- | --- | --- |
| `removed_suggestions` | 1 | `URL`, `Name`, `Username` | entry `timestamp` | `label_values` `Username` |
| `restricted_profiles` | 3 | `URL`, `Name`, `Username` | entry `timestamp` | `label_values` `Username` |
| `hide_story_from` | 4 | `URL`, `Name`, `Username` | entry `timestamp` | `label_values` `Username` |
| `close_friends` | 8 | `URL`, `Name`, `Username` | entry `timestamp` | `label_values` `Username` |
| `recent_follow_requests` | 5 | `URL`, `Name`, `Username` | entry `timestamp` | `label_values` `Username` |
| `follow_requests_you've_received` (connections half) | 14 | `URL`, `Name`, `Username` | entry `timestamp` | `label_values` `Username` |
| `recently_unfollowed_profiles` | 20 | `URL`, `Name`, `Username` | entry `timestamp` | `label_values` `Username` |
| `blocked_profiles` | 9 | `URL`, `Name`, `Username` | entry `timestamp` | `label_values` `Username` |
| `pending_follow_requests` | 23 | `URL`, `Name`, `Username` | entry `timestamp` | `label_values` `Username` |

`removed_suggestions` stores one envelope **object** (same keys, not wrapped in
an array); the other eight store an **array** of entries. Every one of the 87
entries carries `Name` and `Username`; no entry is missing either.

### 2.2 The Threads follow-request entry — the `threads/` half

```
{ text_post_app_text_post_app_follow_requests_received: [
    { string_list_data: [ { href, value, timestamp } ] }
] }
```

15 entries. `value` is the username, `href` is a `threads.com` profile URL, and
`timestamp` is the request date. No labels. `Name` is absent: the username is the
only display string.

### 2.3 The follower entry

```
[ { title, media_list_data: [], string_list_data: [ { href, value, timestamp } ] } ]
```

325 entries. `title` is present but **empty on all 325**. `value` is the
username, `href` is an `instagram.com` profile URL, `timestamp` is the date the
account followed you. There is no display name distinct from the username.

### 2.4 The following entry

```
{ relationships_following: [
    { title, string_list_data: [ { href, timestamp } ] }
] }
```

3,362 entries. `title` is the username. The list item has **no `value` key** at
all; `href` is an `instagram.com` profile URL and `timestamp` is the date you
followed. There is no display name distinct from the username.

### 2.5 The hashtag entry

```
{ relationships_following_hashtags: [
    { title, media_list_data: [], string_list_data: [ { href, value, timestamp } ] }
] }
```

13 entries. `title` is empty on all 13. `value` is the tag (without a leading
`#`), `href` is the tag's page URL on `instagram.com`, `timestamp` is when you
followed it. This is a topic, not a person.

### 2.6 The synced-contact entry

```
{ contacts_contact_info: [ { string_map_data: {
      "First Name":         { value },
      "Last Name":          { value },
      "Contact Information":{ value },
      "Imported Time":      { timestamp }
  } } ] }
```

881 entries. The label names are the `string_map_data` keys, verbatim:
`First Name`, `Last Name`, `Contact Information`, `Imported Time`.

| Measure | Count |
| --- | ---: |
| Entries | 881 |
| Carry `First Name` | 881 |
| Carry `Last Name` | 613 |
| Carry `Contact Information` | 881 |
| Carry `Imported Time` | 277 |
| Contact value is phone-shaped | 863 |
| Contact value is email-shaped | 18 |
| Both phone and email in one entry | 0 |
| Neither | 0 |

A contact entry has exactly one contact value, so phone contacts and email
contacts are disjoint sets: 863 + 18 = 881. There is **no username and no profile
URL** anywhere in this category.

## 3. Field mapping for the person card

The mapping is measured per shape, never guessed. `null` means the export has no
such field in that shape.

| Shape | Display name | Username | Profile URL | Date |
| --- | --- | --- | --- | --- |
| Label/value interactions (§2.1) | `Name` | `Username` | **none** — see §4 | entry `timestamp` |
| Threads follow request (§2.2) | the username | `string_list_data[0].value` | `string_list_data[0].href` (threads.com) | `string_list_data[0].timestamp` |
| Follower (§2.3) | the username | `string_list_data[0].value` | `string_list_data[0].href` (instagram.com) | `string_list_data[0].timestamp` |
| Following (§2.4) | `title` | `title` | `string_list_data[0].href` (instagram.com) | `string_list_data[0].timestamp` |
| Hashtag (§2.5) | not a person | not a person | tag page | `string_list_data[0].timestamp` |
| Synced contact (§2.6) | `First Name` + `Last Name` | **none** | **none** | `Imported Time` on 277, absent on 604 |

The two lists whose display name is the username have no second name to show.
The card renders one name line and one muted `@username` line; when they are the
same string, the card must not print the same identifier twice (see the card
contract in ADR 0019).

## 4. Q17, answered: is `href` the profile URL?

Q17 asked this for `liked_posts` and was never answered. The follower files are a
different shape, so the question was re-measured rather than transferred.

| Shape | `href` destination | Count | Verdict |
| --- | --- | ---: | --- |
| Follower | `instagram.com/<username>` — path equals `value` | 325 / 325 | **the profile URL** |
| Following | `instagram.com/_u/<username>` — path segment equals `title` | 3,362 / 3,362 | **the profile URL**, in the `_u/` form |
| Hashtag | `instagram.com/<tag>` — path equals `value` | 13 / 13 | the tag page, **not** a profile |
| Threads follow request | `threads.com/<username>` — path equals `value` | 15 / 15 | **the profile URL on Threads** |

The nine label/value interaction rows are a different story. They have a label
called `URL`, and it is not the profile URL: across all 87 entries it is **empty
on 66** and an **external, non-Instagram website on 21**. It is not an Instagram
profile URL on a single entry. Treating it as the profile URL would mislabel a
saved website as a profile; the card therefore shows **no profile link** for those
rows. The raw value stays in the raw JSON (§6 of AGENTS.md).

No entry in T4 carries media (`media` is always an empty array where present).

## 5. Dates — the projection's "undated" column was wrong

The T3 projection said `following`, `followers` and `following_hashtags` were
undated. That described the *top-level* `timestamp` the event list reads, not the
data. Measured per entry:

| Category | Entries | Dated | Undated | First | Last | Years | Months |
| --- | ---: | ---: | ---: | --- | --- | ---: | ---: |
| `removed_suggestions` | 1 | 1 | 0 | 2018-04-17 | 2018-04-17 | 1 | 1 |
| `restricted_profiles` | 3 | 3 | 0 | 2021-06-17 | 2024-02-10 | 2 | 2 |
| `hide_story_from` | 4 | 4 | 0 | 2019-11-30 | 2021-02-11 | 3 | 3 |
| `close_friends` | 8 | 8 | 0 | 2022-05-23 | 2026-05-13 | 3 | 3 |
| `recent_follow_requests` | 5 | 5 | 0 | 2026-08-18 | 2026-09-22 | 1 | 2 |
| received — connections | 14 | 14 | 0 | 2025-01-10 | 2026-09-30 | 2 | 9 |
| received — threads | 15 | 15 | 0 | 2023-07-06 | 2024-11-04 | 2 | 8 |
| `recently_unfollowed_profiles` | 20 | 20 | 0 | 2026-09-05 | 2026-10-21 | 1 | 2 |
| `blocked_profiles` | 9 | 9 | 0 | 2019-11-26 | 2025-10-13 | 6 | 8 |
| `following_hashtags` | 13 | 13 | 0 | 2017-12-13 | 2021-02-04 | 5 | 7 |
| `pending_follow_requests` | 23 | 23 | 0 | 2015-11-10 | 2026-08-18 | 7 | 16 |
| `followers` | 325 | 325 | 0 | 2015-06-15 | 2026-10-03 | 12 | 100 |
| `synced_contacts` | 881 | 277 | **604** | 2026-08-11 | 2026-08-14 | 1 | 1 |
| `following` | 3,362 | 3,362 | 0 | 2015-06-14 | 2026-10-19 | 12 | 119 |

Every person and hashtag category is fully dated. The one partially dated
category is `synced_contacts`, and its date is `Imported Time` — when the contact
was imported, not when any relationship began. A card may show it as a date, but
the label must say "Imported", never "followed" or "connected".

Where the date sits:

- the nine label/value interaction rows: the entry's top-level `timestamp`;
- the Threads, follower, following and hashtag rows: `string_list_data[0].timestamp`;
- `synced_contacts`: `string_map_data["Imported Time"].timestamp`, on 277 of 881.

The first path is already the T2/T3 date path. The `string_list_data` path is one
the event list already reads (`liked_comments`). No new date *format* is needed;
only the person reader needs to ask for it.

## 6. The collision: `follow_requests_you've_received.json` is two files

The same basename exists in two folders:

| Folder | Container | Entries | Person identifier | Profile destination |
| --- | --- | ---: | --- | --- |
| `connections/followers_and_following/` | array of label/value envelopes | 14 | `label_values` `Username` | `URL` label: empty or external |
| `your_instagram_activity/threads/` | object with a `text_post_app_…` wrapper | 15 | `string_list_data[0].value` | `threads.com/<username>` |

Set comparison, case-insensitive on the username:

| Measure | Count |
| --- | ---: |
| Named in both files | **0** |
| Only in `connections/` | **14** |
| Only in `threads/` | **15** |
| Total | 29 |

**Verdict: disjoint.** The two files share no person. They are two different
apps' follow requests: Instagram in `connections/`, Threads in
`your_instagram_activity/threads/`. The 29 the sidebar shows is a sum of two
unrelated lists, and one row for them makes the screen claim a single list that
does not exist.

**Decision (D3, recorded in ADR 0018): split into two registry rows.** The
`connections/` row keeps the id `follow_requests_you've_received`; the Threads row
gets the id `threads_follow_requests_received`. Each is resolved by its **parent
folder**, because the basename is identical and tier 2 cannot separate two
different app shapes reliably on its own.

## 7. Grouping and the person card

| Group | Categories | Rows | Entries | Fits the person card? |
| --- | --- | ---: | ---: | --- |
| People with a date | `removed_suggestions`, `restricted_profiles`, `hide_story_from`, `close_friends`, `recent_follow_requests`, `follow_requests_you've_received`, `threads_follow_requests_received`, `recently_unfollowed_profiles`, `blocked_profiles`, `pending_follow_requests`, `followers`, `following` | 12 | 3,777 | **yes** |
| Hashtags with a date | `following_hashtags` | 1 | 13 | **no** — a tag is not a person, and initials for a tag are meaningless |
| Contacts, partially dated | `synced_contacts` | 1 | 881 | **no** — no username, no profile URL; the contact value is the content |

Before the split the first group is 11 rows and 3,748 entries; after it, 12 rows
and 3,777. The split changes the sidebar's T4 present count from 13 to 14, which
is the honest count of files, not a counting defect.

The expected grouping was "~8 with dates, ~3 without, 1 hashtag, 1 contact". The
measurement corrects the middle column: **all 11 person rows are dated**;
`following`, `followers` and `following_hashtags` carry per-entry timestamps. Only
`synced_contacts` is partially undated (277 of 881), and its date is an import
time, not a relationship time.

## 8. Scale — Following's 3,362 rows

| Measure | Value |
| --- | ---: |
| Entries | 3,362 |
| With a usable timestamp | 3,362 (100%) |
| Distinct months holding an entry | 119 |
| Distinct years | 12 (2015–2026) |
| Inclusive span | 137 months |
| Busiest year | 2016, 693 entries |

Every entry carries a date, so the year level applies: 137 months is far above
the 24-month rule (ADR 0015). The person list groups by year, newest first, and
sorts alphabetically inside a year; it does not use the event list's day fold,
because a person list is a directory, not a chronology. The 200-row page cap
(AGENTS §7) applies to the flattened list: 200 cards, then one "show more" button.

The measured DOM node count for the rendered `/categories/following` screen at
its first 200-row page is recorded in §10 once the screen exists; the projection
is under 2,000 nodes (200 cards plus year headings), which is the threshold below
which AGENTS §7 says not to virtualise.

## 9. Screen assignment

| Screen | Categories | Count |
| --- | --- | ---: |
| Person list (card per person, year fold, 200/page) | the 12 person rows in §7 | 12 |
| Tag list (tag + link + date) | `following_hashtags` | 1 |
| Contact table, behind the reveal gate | `synced_contacts` | 1 |
| Table / raw tree | `secret_conversations` only when it is present | 0 present |

No T4 category is left on the generic table or tree by omission. `secret_conversations`
is absent from this export and keeps the muted sidebar treatment already used for
`reels`; it becomes a normal link if a future export carries the file.

## 10. What is still open

- The person card and the tag list are M23 commits 2 and 3. The DOM count in §8
  is filled in by the commit that renders the screen, because a projection is not
  a measurement.
- `synced_contacts` is the only T4 row that gates (D2). Its copy names address-book
  names and contact details, and the repository is not read before the reveal.
- The label/value interactions carry no profile URL at all (§4). A card for them
  shows initials, the display name, the username and the date, and **no link**. A
  constructed Instagram URL from the username would be an invention and is not
  taken.
