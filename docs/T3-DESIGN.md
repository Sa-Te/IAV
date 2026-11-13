# T3 — what the eighteen present categories actually contain

Measured from `archive-2/` on 2026-11-13 (M22), before any T3 screen was
designed. This document is the evidence for the grouping, the hero/date mapping
and the screen assignment. It contains key names, label strings, types, counts
and shapes only: no personal value is reproduced.

The probe ran the same resolve path the app's ingest runs over all 742 files,
then read every T3 category's entries, the key set of a representative entry,
every label name inside `label_values`, `string_map_data` or `string_list_data`,
the key that carries the date, and whether any entry carries media or a URL.
Counts are the app's own entry counts, not a second opinion.

## 1. The eighteen present rows, plus the one absent

| Category | Display name | Entries | Present |
| --- | --- | ---: | --- |
| `profile_photos` | Profile photos | 1 | yes |
| `story_reaction_sticker_reactions` | Story reaction stickers | 1 | yes |
| `reels_comments` | Reels comments | 12 | yes |
| `questions` | Story questions | 12 | yes |
| `emoji_sliders` | Emoji sliders | 20 | yes |
| `archived_posts` | Archived posts | 27 | yes |
| `quizzes` | Story quizzes | 44 | yes |
| `posts` | Posts | 78 after the merge fix (§2); 129 raw entries in 2 files | yes |
| `story_likes` | Story likes | 311 | yes |
| `liked_comments` | Liked comments | 156 | yes |
| `stories` | Stories | 209 | yes |
| `saved_collections` | Saved collections | 8 | yes |
| `post_comments` | Comments | 853 | yes |
| `polls` | Story polls | 957 | yes |
| `saved_posts` | Saved posts | 1,065 | yes |
| `liked_posts` | Liked posts | 42,197 | yes |
| `instants_interactions` | Instants interactions | 2 | yes |
| `other_content` | Other content | 5 | yes |
| `reels` | Reels | — | **no** — registered unmeasured, `signatures: []` (ADR 0008) |

### `liked_posts` — the largest list, and the year level's real test

| Measure | Value |
| --- | --- |
| Entries | 42,197 |
| Earliest / latest timestamp | 2015-06-14 / 2026-10-29 |
| Distinct months holding an entry | **121** |
| Distinct years | **12** (2015–2026) |
| Inclusive span | **137 months** |

Entries per year: 2015: 232 · 2016: 1,960 · 2017: 5,162 · 2018: 3,691 ·
2019: 6,651 · 2020: 8,893 · 2021: 7,910 · 2022: 5,529 · 2023: 1,489 ·
2024: 339 · 2025: 107 · 2026: 234. The busiest month holds 1,435 entries.

The span is what decides the year level (D2 fixed the rule at 24 months), so it
engages — 137 > 24, and so would 25. The number is reported because it also says
how much of the year fold the reader will actually use: most T3 and T2 lists never
see it.

Rendered in the browser against this archive: 12 year rows covering 121 months,
and **367 DOM nodes (53 inside the list) with every year collapsed**, zero rows.
As rendered — newest year open, months closed — 409 nodes. That is the low
hundreds the budget asks for, not thousands (ADR 0015).

The old drift report's wrapper-key names for several of these rows
(`story_activities_*`, `likes_media_likes`, `saved_saved_media`, …) no longer
describe `archive-2/`: the export now writes root arrays of label/value envelopes
(`fmt-b1cb31`). The name rules are what resolve them; the stale signatures are
the drift document's problem, not this one.

## 2. The Posts anomaly — the merge was wrong in two ways

### What the row merged

`posts` resolved **three** files:

| File | Raw entries | What it is |
| --- | ---: | --- |
| `your_instagram_activity/media/posts.json` | 78 | posts, newer shape: `{fbid, label_values, media, timestamp}`, media nested under the label `Media` |
| `your_instagram_activity/media/posts_1.json` | 51 | posts, legacy shape: `{media: [record]}`, media at the top level |
| `personal_information/personal_information/note_and_repost_interactions.json` | 2 | **not posts**: `{fbid, label_values, media}`, each entry holding one label-less `Author` container and nothing else |

`78 + 51 + 2 = 131`, the count the row reported. Of those 131 entries:

- **51** carry a top-level `media` array with a non-empty `uri` (the legacy file);
- **78** carry `media: []` at the top level and their one media record inside the
  `Media` label (the newer file);
- **2** carry no media at all (`media: []`, no `Media` label).

So "131 entries, 51 media" was two defects at once: a file that is not posts was
folded in, and the media reader only looked at the top level, so it saw the
legacy 51 and none of the newer 78.

### Why the 2 arrived

`posts` was registered with a single structural signature, `{kind: "array",
requiredKeys: ["media"]}`. `note_and_repost_interactions.json` matches no
basename rule, so it fell to tier 2, and every one of its entries has a `media`
key. It was therefore accepted as posts. The non-posts file was also defining
`posts`' fingerprint (`{fbid, label_values, media}`, the note file's key set),
which is why the archive fingerprint moved from `fmt-46b755` to `fmt-b1cb31`
after the fix.

### Why the 51 were double-counted

The two posts files describe the same posts, not two halves of one list:

- the 51 legacy media URIs are all present among the newer file's 78, one for one;
- the newer file adds **27** URIs the legacy file never had (2016–2021 posts);
- no URI appears twice inside either file.

An additive merge is the right rule for a category Instagram splits into
`posts_1.json` + `posts_2.json`; it is the wrong rule for one content set written
twice in two formats. Media URI is the identity: 78 posts, 78 media items.

### The fix (M22)

- `posts`' signature now requires the legacy shape to *not* carry `fbid`,
  `label_values` or `timestamp`. A label/value array is no longer posts; the
  note file falls to the unrecognised bucket, where an unmapped file belongs
  (ADR 0002), and registering it is a separate decision (§7).
- `packages/core/src/parsers/posts.ts` reads both measured shapes and counts a
  media URI once, keeping the richer caption when a duplicate record supplies
  one. It is the only reader of both shapes.
- `entryCountForView` (core) reports the 78 the gallery shows instead of the 129
  the files hold. The stored count stays raw on purpose: drift reports describe
  files, not screens.

**Verdict:** the merge was wrong. A non-posts file was folded in, and the same 51
posts were counted twice. Both are fixed and tested.

## 3. The eighteen rows in detail

`Labels` are the exact display strings the export uses. "Container" means a
label-less item (`{"title": …, "dict": […]}`) — it is not a label, so it never
becomes a field on a row and stays in the raw JSON. `string_map_data.X.timestamp`
means the label object has no `value` and a numeric `timestamp` beside it.

| Category | Representative entry keys | Labels (verbatim) | Hero | Date | URL | Media |
| --- | --- | --- | --- | --- | --- | --- |
| `profile_photos` | `creation_timestamp`, `cross_post_source`, `media_metadata`, `title`, `uri` | none — media record under `ig_profile_picture` | `title` (gallery caption) | `creation_timestamp` | no | 1 |
| `story_reaction_sticker_reactions` | `fbid`, `label_values`, `media`, `timestamp` | `Emoji`; container `Owner` | none | entry `timestamp` | no | no |
| `reels_comments` | `string_map_data` | `Comment`, `Media Owner`, `Time` | `Comment` (§5) | `Time.timestamp` | no | no |
| `questions` | `fbid`, `label_values`, `media`, `timestamp` | `Question`, `Answer`, `Update time` (`timestamp_value`); container `Media` | `Question` (§5) | entry `timestamp` | no | no |
| `emoji_sliders` | `fbid`, `label_values`, `media`, `timestamp` | `Question`, `Emoji`, `Text colour`, `Background colour`, `URL`, `Caption`, `Title`; containers `Hashtags`, `Owner`, `Brand partner` | `Caption`, else `Question` | entry `timestamp` | yes (20) | no |
| `archived_posts` | `media` (group) → `uri`, `creation_timestamp`, `title`, `cross_post_source`, `media_metadata` | none — media record under `ig_archived_post_media` | `title` (gallery caption) | `creation_timestamp` | no | 27 |
| `quizzes` | `fbid`, `label_values`, `media`, `timestamp` | `Question`; container `Media` | `Question` (§5) | entry `timestamp` | no | no |
| `posts` | newer: `fbid`, `label_values`, `media`, `timestamp`; legacy: `media` | newer: `Caption`, `Title`, `Media`, `Published`, `Draft`, `Visibility`, `Expiry time`, `Creation time`, `Update time`, `Subtype`, `Story type`, `Latitude`, `Longitude`, `Amount raised`, `Upload identifier`, `Marked as AI generated`, `Paid partnership`, `Hide like and view counts`, `Who can reply to your post`, `Metadata`, `File size in bytes`, `Draft identifier`, `Hidden from profile, but shown in feed`, `Original width`, `Original height`, `Is an advertisement`, `Reply approval required`, `Visual reply using existing media`, `Publish mode`, `How you opened the camera`, `Created from draft`, `Is audio muted`, `Folders on device`, `Device name`, `How you opened the camera from the browser` | `Caption` (gallery caption) | `creation_timestamp`, else entry `timestamp` | no | 78 |
| `story_likes` | `fbid`, `label_values`, `media`, `timestamp` | `URL`, `Caption`, `Title`; containers `Hashtags`, `Owner`, `Brand partner` | `Caption` (127), else none | entry `timestamp` | yes (311) | no |
| `liked_comments` | `title`, `string_list_data` → `href`, `timestamp`, `value` | none — `title` + `string_list_data` | `title` (the account) | `string_list_data[0].timestamp` | `href` (156) | no |
| `stories` | `creation_timestamp`, `cross_post_source`, `dubbing_info`, `media_metadata`, `media_variants`, `title`, `uri` | none — media record under `ig_stories` | `title` (gallery caption) | `creation_timestamp` | no | 209 |
| `saved_collections` | `fbid`, `label_values`, `media`, `timestamp` | `Name`, `Type`, `Privacy`, `Update time` (`timestamp_value`); container with empty `dict` | `Name` | entry `timestamp` | no | no |
| `post_comments` | `media_list_data`, `string_map_data` | `Comment` (851), `Media Owner` (623), `Time` (853) | `Comment` (§5) | `Time.timestamp` | no | effectively none — `media_list_data[0].uri` is `""` on 851 of 853 |
| `polls` | `fbid`, `label_values`, `media`, `timestamp` | `Question`, `Option 1`…`Option 4`, `Option 1 font size`…`Option 4 font size`, `Colour`, `Anonymous poll`, `Type`, `Expiry time` (`timestamp_value`), `URL` (781), `Caption` (184), `Title` (184); containers `Hashtags`, `Owner`, `Brand partner` | `Caption`, else `Question` | entry `timestamp` | yes (781) | no |
| `saved_posts` | `fbid`, `label_values`, `media`, `timestamp` | `URL` (1,065), `Caption` (1,039), `Title` (1,039); containers `Hashtags`, `Owner`, `Brand partner` | `Caption`, else `Title` | entry `timestamp` | yes (1,065) | no |
| `liked_posts` | `fbid`, `label_values`, `media`, `timestamp` | `URL` (42,197), `Caption` (38,039 non-empty), `Title` (785 non-empty); containers `Hashtags`, `Owner`, `Brand partner` | `Caption`, else `Title` | entry `timestamp` | yes (42,194 `href`) | no |
| `instants_interactions` | `fbid`, `label_values`, `media`, `timestamp` | `Media` (empty arrays), `URL`, `Emoji`; container `Metadata` | none | entry `timestamp` | yes (2) | 0 (the `Media` arrays are empty) |
| `other_content` | `fbid`, `label_values`, `media`, `timestamp` | the same 27 labels as `posts`' newer shape, plus containers `Media`, `Metadata`, `Place`, `Reel metadata`, `Repost`, `Hashtags` | none | entry `timestamp` | no | 1 of 5 entries has a non-empty `uri` |

### The timestamp-in-string-map finding, again

`post_comments` and `reels_comments` put the date in `string_map_data.Time`, which
has **no `value`** and a numeric `timestamp` beside it — the same shape the T2
design found in `login_activity`, `logout_activity`, `profile_changes` and
`signup_details`. No other T3 category has that shape: everything else carries a
top-level `timestamp`, and `liked_comments` carries its date in
`string_list_data[0].timestamp`. Both of those paths already exist in
`eventListView.ts`; no new date code is needed for T3.

### What the rows carry that the screen will not show

The label-less containers (`Owner`, `Hashtags`, `Brand partner`, `Media`,
`Metadata`, `Place`, `Reel metadata`, `Repost`) hold nested labelled records — for
example `Owner` holds `Name`, `Username` and the owner's profile `URL`. They are
not labels, so the event row does not render them; they stay in the raw JSON,
which is the rule for anything the row does not interpret (AGENTS §6). Making
them a field would be a different decision and is not taken in M22.

## 4. Q18 — saved collections and saved posts

**The link exists, and it is nested.** The first M22 measurement of Q18 said
"no linkage: 0 of 8 collection ids appear in `saved_posts`". That was wrong in the
way measurements of nested shapes usually go wrong: it compared strings across the
two files and never looked inside each collection, where the saved posts are
embedded as **full records**.

The measured structure of one `saved_collections` entry:

```
[fbid, timestamp, media, label_values]
  label_values:
    {label: "Name", value}          — the folder's name
    {label: "Type", value}          — "Default"
    {label: "Privacy", value}       — "Private" | "Collaborative"
    {label: "Update time", timestamp_value}
    {dict: [                        — ONE label-less container
      {title: "", dict: [           — ONE saved post
        {label: "URL", value, href},
        {label: "Caption", value},
        {label: "Title", value},
        containers: Hashtags / Owner / Brand partner
      ]},
      …
    ]}
```

Measured across all eight collections in `archive-2/`:

| Measure | Value |
| --- | ---: |
| Collections | 8 |
| Posts nested inside collections | 356 (355 distinct URLs; one URL is in two collections) |
| Posts per collection | 25 · 25 · 34 · 7 · 2 · 51 · 141 · 71 |
| Those URLs that also occur in `saved_posts` | 329 |
| Nested posts with no matching flat entry | 27 (the flat list is not a superset) |
| `saved_posts` entries | 1,065 |
| Saved posts in no collection | 736 |
| A cross-file id (fbid) link | none — and none is needed |

**Identity between the two files is the post URL**, the same rule `posts` uses for
its media URI. The flat file supplies a date for a collection's post; a nested post
with no flat entry keeps no date, and the 736 posts in no collection are shown as
themselves.

**Finding:** collections are folders, and the screen is eight folders plus the
uncollected remainder. The earlier "two separate lists" conclusion is withdrawn.

## 5. Grouping, honestly

| Group | Categories | Count | What it needs |
| --- | --- | ---: | --- |
| Event/activity lists | `story_reaction_sticker_reactions`, `questions`, `emoji_sliders`, `quizzes`, `story_likes`, `polls`, `liked_posts`, `instants_interactions`, `other_content` | 9 | the T2 event list |
| Saved folders | `saved_collections`, `saved_posts` | 2 | collections with their posts; the flat list joined by URL |
| Comment lists (same screen, gated) | `post_comments`, `reels_comments`, `liked_comments` | 3 | the T2 event list behind the reveal gate |
| Media galleries | `profile_photos`, `archived_posts`, `posts`, `stories` | 4 | the existing gallery routes (D4 — never duplicated onto the event list) |
| Fits neither | — | 0 | — |

**Covered by the T2 screen unchanged (6):**
`story_reaction_sticker_reactions`, `story_likes`, `liked_posts`,
`instants_interactions`, `other_content`, `liked_comments`
(title/`string_list_data` is the measured T2 shape) — plus the date handling for
both comment categories, which is the same `string_map_data.Time.timestamp` path
T2 already reads.

**Need only a hero mapping (5):** `questions` and `quizzes` use `Question`;
`polls` and `emoji_sliders` use `Question` when there is no `Caption`;
`post_comments` and `reels_comments` use `Comment`. Those two label names are not
in the T2 priority list, which was measured on T2's labels only. Extending the
priority with `Question` and `Comment` is the whole change: no new screen, no new
date path.

**Need something new (2):** `saved_collections` and `saved_posts`, because the
collection membership is nested rather than keyed (§4); `profile_photos`, because a
photo is not a list. Both are small, measured screens, not a new framework.

**Also new on an existing screen (2):** a sticker row applies the colours it was
drawn with, and a poll row shows its options at their own sizes, instead of
printing `Background colour: #FFFFFF` and `Option 1 font size: 35` (ADR 0016). The
story link a reaction, question or quiz keeps inside a label-less container is now
the row's link.

## 6. Screen assignment

| Screen | Categories | Count |
| --- | --- | ---: |
| Event list (month → year → day → row, ADR 0013/0015) | 9 event lists + 3 comment lists | 12 |
| Saved folders (collection → posts) | `saved_collections`, `saved_posts` | 2 |
| Photo | `profile_photos` (its own screen since the M22 follow-up) | 1 |
| Gallery (existing routes) | `posts`, `stories`, `archived_posts` | 3 |

No T3 category is left on the generic table or tree.

## 7. What this measurement leaves open

- `note_and_repost_interactions.json` is now in the unrecognised bucket. It is a
  real, unregistered category: 2 entries, one label-less `Author` container each,
  no timestamp and no media. Registering it needs a name rule and a privacy tier,
  and that is a decision, not a measurement. It must not be folded into `posts`
  again (it was measured doing exactly that since M8).
- `post_comments[].media_list_data[0].uri` is empty on 851 of 853 entries and
  non-empty on **2**. The manifest's claim that it is *always* empty is no longer
  true, and the two real URIs resolve to files present in the ZIP. Whether the
  commented-on media should be shown is a product question; the event row does
  not show it in M22.
- `liked_comments[].string_list_data[0].value` is the same four-character string
  on all 156 entries. It is not the comment text and carries no per-entry
  information; the screen uses `title` (the account) and `href` only.
- `post_comments` and `reels_comments` carry no URL anywhere in the entry, at any
  depth (measured, 853 + 12 entries). Their rows show the owner and the words, and
  no link can be shown without inventing one. `liked_comments` does carry an
  `href` and shows it.

## 8. T4 and T5 remaining — the projection

The same probe over the 18 categories still without a bespoke screen. Measured
from `archive-2/` on 2026-11-13; entries are the app's own counts.

### T4 — third-party identities (13 present, 1 absent: `secret_conversations`)

| Shape | Categories | Entries | Date on the entry | What is left |
| --- | --- | ---: | --- | --- |
| Dated identity list | `restricted_profiles`, `hide_story_from`, `close_friends`, `recent_follow_requests`, `follow_requests_you've_received`, `recently_unfollowed_profiles`, `blocked_profiles`, `pending_follow_requests` | 3 · 4 · 8 · 5 · 29 · 20 · 9 · 23 | yes, top-level `timestamp` | one row per interaction, hero = the person |
| Undated identity list | `following`, `followers`, `following_hashtags` | 3,362 · 325 · 13 | no | one row per person/topic, no date fold |
| Contact records | `synced_contacts` | 881 | no | a table, not a list |
| Single envelope | `removed_suggestions` | 1 | no | settings-style field list |

The 13 are two different screens, not one: eight are dated interactions (a person
**and** a moment) and five are undated identity/contact lists. T2-DESIGN §7 called
this "a person/identity list"; the measurement says that name hides the split.
Identity lives in `string_list_data[].value` (or `title`), not in a label, so the
event list's hero mapping cannot read it without a new field role. Nothing in T4
carries media.

### T5 — third-party authored text (5 present, 0 absent)

| Category | Entries | Shape | What is left |
| --- | ---: | --- | --- |
| `messages_inbox` | 122 files | thread objects | thread list, already built and gated |
| `messages_requests` | 142 files | thread objects | thread list, already built and gated |
| `threads_viewed` | 246 | `string_map_data` with `Author`, `Time`, `URL` | the event list behind the gate, with `Author` as the hero |
| `ai_conversations` | 2 | label/value envelope with `Summary`, `Messages`, `Image`, … | its own screen; the conversation is nested, not a row |
| `checkout_payment_information` | 1 | label/value envelope | the settings screen behind the gate |

`threads_viewed` is the only one that is the existing event list with another hero
name. `ai_conversations` is the only genuinely new screen left in the archive.

### What is blocked on a decision only the owner can make

1. **T4's two shapes.** Are the eight dated rows "events about a person" (event
   list, hero = the person) or "people, with a date" (person list, date as a
   field)? The same data supports both; the choice decides one screen or two.
2. **Filters and search.** D3 deferred them for T3. T4's 3,362-row `following`
   list is the first place absence of search will be felt.
3. **The two real comment media URIs** (`post_comments`, 2 entries): show the
   commented-on media, or keep the row textual?
4. **`profile_photos`' place in the sidebar.** It now has its own screen with the
   photo, caption and date, but no gallery route or sidebar entry of its own; it is
   reachable from the T3 page and from `/categories` only.
5. **`note_and_repost_interactions.json`** (§7): a registry row and a tier.
