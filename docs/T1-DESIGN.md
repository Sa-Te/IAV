# T1 — what the twelve present categories actually contain

Measured from `archive-2/` on 2026-11-13 (baseline `fmt-e57990`), before any T1
screen was designed. This document is the evidence for the grouping and the screen
proposals that follow. It contains key names, types, counts and shapes only: no
personal value, label string or identifier is reproduced.

The measurement is structural. A probe read each file and reported the top-level
container, the representative entry's key-set, every label-item variant, the value
kind and length class, and whether a media, URL, timestamp or nested list appears
anywhere. `avatar_items.item` was additionally decoded as base64 and inspected for
an image header. Nothing was inferred from a category's name.

## 1. The twelve present rows

`entry` means one element of the stored array, or the single envelope object.
`labels` counts the label/value pairs inside one entry. "Envelope" means the
`{fbid, label_values, media, timestamp}` shape already handled by `toTableView`;
`string map` means `string_map_data`, whose keys are the labels.

| Category | Entries | Representative entry keys | Label-item variants (count) | Media | URL | Timestamp | Nested list |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `notification_preferences` | 1 | `timestamp`, `media`, `label_values`, `fbid` | `{label, dict}` (1), `{label, timestamp_value}` (1) | empty `media` | no | yes | `dict` (3 rows) |
| `eligibility` | 1 | `title`, `media_map_data`, `string_map_data` | string map: `{href, value, timestamp}` (3) | empty `media_map_data` | empty `href` only | yes (zero) | no |
| `bug_reports` | 1 | `media`, `label_values`, `fbid` | `{label, value}` (1), `{label, description, value}` (1) | empty `media` | no | no | no |
| `instagram_profile_information` | 1 | `media`, `label_values`, `fbid` | `{label, timestamp_value}` (10), `{label, value}` (5), `{label}` (1) | empty `media` | no | yes (6 zero) | no |
| `instagram_friend_map` | 1 | `media`, `label_values`, `fbid` | `{label, timestamp_value}` (5), `{label, title, dict}` (4), `{label, value}` (1), `{label}` (1) | empty `media` | no | yes (4 zero) | `dict` (4 empty) |
| `your_link_history_settings` | 1 | `timestamp`, `media`, `label_values`, `fbid` | `{label}` (1), `{label, timestamp_value}` (1) | empty `media` | no | yes | no |
| `consents` | 1 | `timestamp`, `media`, `label_values`, `fbid` | `{label, value}` (1), `{label, timestamp_value}` (1) | empty `media` | no | yes | no |
| `your_activity_off_meta_technologies_settings` | 1 | `timestamp`, `media`, `label_values`, `fbid` | `{label, value}` (5), `{label, timestamp_value}` (1), `{label, dict}` (1) | empty `media` | no | yes (1 zero) | `dict` (empty) |
| `your_information_download_requests` | 2 | `timestamp`, `media`, `label_values`, `fbid` | `{label, timestamp_value}` (8), `{label, value}` (8), `{label}` (4), `{label, vec}` (2) | empty `media` | no | yes (all 8) | `vec` (2 empty) |
| `ad_preferences` | 1 | `media`, `label_values`, `fbid` | `{label, title, dict}` (3), `{label, vec}` (1), `{label, value}` (1), `{label}` (1) | empty `media` | no | no | `dict` (3 empty), `vec` (empty) |
| `avatar_items` | 13 | `item`, `type`, `acquisition_time` | none — no label layer | no `media` key | yes, every entry | yes (`acquisition_time`) | no |
| `device_camera_effects_support` | 30 | `timestamp`, `media`, `label_values`, `fbid` | `{label, value}` (30), `{label, dict}` (60) | empty `media` | no | yes (all 30) | two `dict`s per entry (1 and 8 rows) |

Two facts that matter for the screen and are easy to miss:

- **A timestamp is Unix seconds even when negative.** One `timestamp_value` in
  `your_information_download_requests` is negative (a pre-1970 date); its string is
  eleven characters because of the minus sign, not because it is milliseconds.
  The existing seconds-based formatter is correct; no unit heuristic is needed.
- **Zero is used as "not set".** Eleven `timestamp_value` fields across five
  categories are exactly `0`. Rendering those as 1 January 1970 would invent an
  event. The screen must show the raw `0` and no localised date.

## 2. The two non-trivial rows

### `avatar_items` — 13 entries

Entry keys: `item` (string), `type` (string), `acquisition_time` (number).

- `item` is **not** base64 and does not contain image bytes. It is an absolute
  `https://` URL, 91–381 characters, pointing at a Facebook CDN host (two hosts
  observed) with a `.png` path and seven query parameters. Decoding the string as
  base64 produces a non-image header (`86 db 69 b3 …`), so there is nothing local
  to draw.
- `type` is a single short text value for all thirteen entries.
- `acquisition_time` is Unix seconds.
- There is no `label_values` layer, no `media` key and no local media file
  reference. The image exists only at the remote URL.

**Consequence:** a grid of thumbnails is impossible without a network fetch, which
invariant §1.1 forbids. The honest screen is a grid of labelled placeholders plus
the URL as a user-initiated link.

### `device_camera_effects_support` — 30 entries

All thirty entries share one shape:

```
{
  timestamp: number,
  media: [],
  label_values: [
    { label, value },        // a 32-character lowercase hex identifier
    { label, dict: [1 × { label, value }] },
    { label, dict: [8 × { label, value }] }
  ],
  fbid: string
}
```

- The first `value` is 32 hex characters in every entry — opaque, not displayable.
- The 1-row list holds one long text value (323 characters).
- The 8-row list holds feature-support values: short text, a 3-character text,
  a 7-character text and boolean strings.
- Thirty distinct `fbid`s and thirty distinct timestamps: these are thirty devices,
  not thirty copies of one device.
- No media, no URL, no nested list beyond the two `dict`s.

**Consequence:** this is a repeated device record whose meaning lives in its two
nested lists. It is not a single settings page, and the settings screen would have
to hide the device identity in a section heading to fit.

## 3. What each category actually is

One line each, grouped by what the content is — not by the category's name.

**Group A — one or two label/value envelopes (10 categories).** Every row is a
small set of labelled fields. Nine are a single entry; one is two entries. The
fields are scalars, timestamps, empty nested lists and bare labels. None has
media, none has a usable URL, and the largest has sixteen fields.

- `notification_preferences` — one envelope, two fields, one nested list of three.
- `eligibility` — one entry from a three-row string map; empty hrefs, zero timestamps.
- `bug_reports` — one envelope, two text fields, one with the export's description.
- `instagram_profile_information` — one envelope, sixteen fields (ten timestamps).
- `instagram_friend_map` — one envelope, eleven fields, four empty titled lists.
- `your_link_history_settings` — one envelope, one bare label and one timestamp.
- `consents` — one envelope, one scalar and one timestamp.
- `your_activity_off_meta_technologies_settings` — one envelope, seven fields.
- `your_information_download_requests` — two envelopes, eleven fields each.
- `ad_preferences` — one envelope, six fields, three empty titled lists.

**Group B — media references without local media (1 category).**

- `avatar_items` — thirteen records of a remote URL, a type and an acquisition time.

**Group C — repeated device records (1 category).**

- `device_camera_effects_support` — thirty devices, each with an opaque ID and two
  nested feature lists.

The split is 10 / 1 / 1. The ten in Group A share one screen because they share one
content shape: a labelled field list. Group B and Group C do not share it: one has
no labels at all, the other is a list of records whose nested lists are the content.

## 4. Screen per group

### Group A — the settings screen

**What it is.** A definition list, not a table. The hero is the category title and
one count line. Each field is a label in muted caption type above a value in body
type, with space between fields rather than rules or colour. One entry and thirty
entries use the same component: below two entries it reads as a page; above one it
repeats an entry section.

```
┌ T1 category title ──────────────────────────────────────────┐
│ 1 entry · 16 fields                                         │
│                                                             │
│  Label (muted, caption)                                     │
│  Value (body)                                               │
│                                                             │
│  Timestamp label                                            │
│  12 November 2026 at 14:03        ← localised, primary      │
│  1786001771                       ← raw number, secondary   │
│                                                             │
│  Field with no value                                        │
│  Not provided                     ← muted, honest            │
│                                                             │
│  ▸ Nested section heading (3 rows)                          │
│      Child label        child value                         │
│      Child label        child value                         │
│                                                             │
│  ▸ Raw data                       ← closed by default        │
└─────────────────────────────────────────────────────────────┘
```

At thirty entries:

```
┌ T1 category title ──────────────────────────────────────────┐
│ 30 entries · 3 fields each                                  │
│                                                             │
│  Entry 1                                                    │
│    Field A             value                                │
│    Field B             12 November 2026 · 1786001771        │
│    ▸ Nested section (8 rows)                                │
│                                                             │
│  Entry 2                                                    │
│    …                                                        │
└─────────────────────────────────────────────────────────────┘
```

Rules the table cannot satisfy and this screen must:

- A scalar is a labelled field, never a one-row table.
- A `dict` or `vec` is its own section, headed by its label (or its `title` when
  the export supplies one), containing a definition list. Empty means "None in
  this export", not a missing section.
- A bare label is a field whose value is "Not provided"; the label is still shown.
- A `description` is the export's own explanation of a field: muted caption text
  under the value, never a tooltip only.
- An opaque value is truncated visually to about eighty characters and expands on
  keyboard focus; its full text is its accessible name, and it is never prettified.
- A timestamp is localised date primary, raw number secondary. `0` is shown as the
  raw number with no date.
- A non-empty URL is a real `<a rel="noreferrer noopener" target="_blank">` whose
  accessible name is the destination. The app never fetches it.
- The raw JSON stays behind a closed disclosure.
- Empty, absent and failed remain the existing `State` component's three states.

### Group B — the avatar screen

```
┌ Avatar items ───────────────────────────────────────────────┐
│ 13 items · images are remote URLs, not fetched              │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ item 1   │  │ item 2   │  │ item 3   │                   │
│  │ no image │  │ no image │  │ no image │                   │
│  │ 379 char │  │ 380 char │  │ 381 char │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                             │
│  Item 1                                                     │
│    Type            short text                               │
│    Acquired        18 November 2025 · 1763…                 │
│    Item            https://… (opens in a new tab)           │
│                                                             │
│  ▸ Raw data                                                 │
└─────────────────────────────────────────────────────────────┘
```

A tile is a labelled placeholder: the item's ordinal, "no image on this device"
and the URL length. It never renders a broken image icon and never invents a
thumbnail. The URL is a link; clicking it is the person's choice and the only
network request in the app that the app itself did not make.

### Group C — the device screen

```
┌ Device camera effects support ──────────────────────────────┐
│ 30 devices                                                  │
│                                                             │
│  Device 1 · 00dcd21f…            ← truncated opaque ID       │
│    Acquired        30 October 2026 · 1793358112             │
│    Metadata                                                 │
│      Supported SDK versions      323-character value…       │
│    Device metadata                                          │
│      Feature A                   True                       │
│      Feature B                   False                      │
│      … eight rows                                           │
│                                                             │
│  Device 2 · …                                               │
└─────────────────────────────────────────────────────────────┘
```

Each device is a section. Its heading is the ordinal plus the truncated opaque ID
(full ID on focus). The two nested lists are definition lists under their own
headings. There is no media and no thumbnail: a device is text.

## 5. Which need a genuinely different screen

- **Share one screen:** the ten Group A categories. They hold the same thing — a
  labelled field list — and differ only in how many fields and entries they have.
  That is a data difference the settings screen already handles, not a design
  difference.
- **Need their own screen:** `avatar_items` (no label layer; remote URL only) and
  `device_camera_effects_support` (thirty device records with nested feature
  lists). Building either as a settings page would either invent thumbnails or
  bury the device identity.

This is the "bespoke per content" rule: two categories share a screen when their
measured content is the same, and get their own when it is not. The grouping above
is a measurement result, not a naming decision.
