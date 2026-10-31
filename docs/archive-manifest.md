# Archive manifest

The reference for the TypeScript parsers. It describes the **structure** of a
real Instagram data export, not its contents.

- **Milestone:** M2 (archive inventory)
- **Produced from:** one real export, by read-only scripts that walked the JSON
  and reported shape, types, counts and byte sizes.
- **Redaction:** no captions, message text, usernames, emails, phone numbers,
  coordinates, URLs or individual media filenames appear in this document.
  Placeholders (`<username>`, `<caption>`, `<ts>`, `media/<group>/<YYYYMM>/<file>`)
  are used wherever an example was needed. Counts, field names, types and sizes
  are real.
- **Nothing here has been parsed.** Every status in `docs/DATA-MAP.md` is
  `not started`.

## Numbers at a glance

| Measure | Value |
| --- | --- |
| Files in the export | 702 |
| JSON files | 326 (28,753,603 bytes) |
| Media files | 376 (133,353,238 bytes) |
| Distinct JSON filenames | 72 → 74 categories (message threads split into two) |
| Categories | 74 |
| Message threads | 254 (112 inbox, 142 requests) |
| Messages | 28,498 |
| Media references from JSON | 377 |
| Media references that resolve to a file | 377 (100%) |
| Media files referenced by nothing | 0 |

---

## 0. How to read this document

### 0.1 Four envelope shapes cover nearly everything

**Shape A — entry list.** An object with exactly one key, whose value is a list
of entry objects. Each entry is some combination of:

```json
{
  "<wrapper_key>": [
    {
      "title": <str>,                     // often a username, sometimes empty
      "string_list_data": [ { "href": <str>, "timestamp": <int>, "value": <str> } ],
      "string_map_data":  { "<Field Name>": { "href": <str>, "timestamp": <int>, "value": <str> } },
      "media_list_data":  [ { "uri": <str> } ]
    }
  ]
}
```

`string_map_data` keys are **display strings with spaces and capitals**
(`"Contact Information"`, `"IP Address"`, `"Saved on"`). They are not
identifiers; treat them as untrusted labels. The nested value object usually has
`value`; `href` and `timestamp` appear only sometimes.

**Shape B — label/value blob.** An object used by the older Facebook-style
settings/interest files:

```json
{
  "fbid": <str>,
  "media": [],
  "label_values": [ { "label": <str>, "value": <str>, "timestamp_value": <int>, "vec": [ { "value": <str> } ] } ],
  "timestamp": <int>                         // present in some files
}
```

`label_values[].vec` is a nested array whose element shape differs per file. It
is the least predictable structure in the export.

**Shape C — raw media list.** A list of media records, either at the root or
under one wrapper key:

```json
[ { "media": [ { "uri": <str>, "creation_timestamp": <int>, "title": <str>,
                 "cross_post_source": { "source_app": <str> },
                 "media_metadata": { … } } ] } ]
```

**Shape D — message thread.** See §3.

### 0.2 Encoding: the files are ASCII; the *strings* are mojibake

This is the most important correction in this document, and it contradicts the
assumption the old Go backend was built on.

- **FACT:** all 326 JSON files are pure ASCII — every byte is `< 0x80`. Not one
  file is ISO-8859-1 encoded on disk.
- **FACT:** 66,987 string values contain code points in `U+0080`–`U+00FF`
  (written in the file as `\uXXXX` JSON escapes), across 195 of the 326 files.
- **FACT:** 100% of those strings round-trip correctly through
  `latin-1 encode → utf-8 decode`. 0 fail.

So Instagram wrote UTF-8 bytes as if they were Latin-1, then JSON-escaped the
result. The corruption is **already inside the string values**. Decoding the
byte stream as ISO-8859-1 (what `reference-backend` does) is a no-op; the repair
must be applied to each decoded string, which is exactly what
`reference-frontend/lib/fixEncoding.ts` does.

**Parsers must apply the repair to every string field of every category**, not
only posts and stories: messages (20,797 affected strings), liked_posts
(45,026), post_comments (387) and eighteen other categories carry it too.

`fixInstagramEncoding` is 14 lines and currently untested. It is the first
function that deserves a unit test.

### 0.3 Timestamps

Two formats coexist and are not interchangeable:

| Field | Format | Example |
| --- | --- | --- |
| `creation_timestamp` | Unix **seconds**, int | `<ts>` |
| `timestamp` (in `string_list_data` / `string_map_data`) | Unix **seconds**, int | `<ts>` |
| `timestamp_ms` (messages only) | Unix **milliseconds**, int | `<ts>` |
| `string_map_data.*.value` for time fields | **Localised display string** | `<display date>` |

Never parse `value` of a time field as a date. Use the sibling `timestamp`.

### 0.4 How media references resolve

There is no single rule. Two coexist:

1. **Archive-root relative** — most files. `"uri": "media/posts/<YYYYMM>/<file>"`
   resolves against the export root.
2. **Thread-directory relative** — messages only.
   `"uri": "photos/<file>"` resolves against the directory of the *thread's own*
   `message_1.json`, i.e. `…/messages/inbox/<thread>/photos/<file>`.

A resolver must try the JSON file's own directory first, then the archive root,
or URL-decode the thread path. `reference-backend` only ever resolved
root-relative paths, which is one reason message attachments could not render.

Some referenced files have **no file extension** (4 of 376). Extension-sniffing
is therefore unreliable; sniff magic bytes instead, or read the MIME type from
the container.

### 0.5 Join keys

The export has **almost no explicit foreign keys**. Joining is done by matching
strings:

| Key | Where it lives | Joins to |
| --- | --- | --- |
| `uri` | every media record | a file path on disk (see §0.4) |
| `title` | entries in shape A | a **username**, when the entry is a relationship or an actor |
| `string_list_data[].value` | likes, following, followers | a username |
| `string_map_data["Media Owner"].value` | comments | a username |
| `string_map_data["Name"].value` | saved collections | a collection name — **not** a username |
| `thread_path` | message threads | the folder path of the thread |
| `fbid` | shape B | an Instagram internal object id |

Usernames are the de-facto primary key for people, and they are mutable. Two
different people can share a display `title` if one was renamed.

---

## 1. Category index

Ordered by the directory they live in. `entries` is the number of records in the
main list of the category (all files summed).

| # | Category | Files | Entries | Bytes | Shape |
| --- | --- | --- | --- | --- | --- |
| 1 | `posts` | 1 | 51 | 29,570 | C |
| 2 | `stories` | 1 | 211 | 113,313 | C |
| 3 | `archived_posts` | 1 | 27 | 15,520 | C |
| 4 | `profile_photos` | 1 | 1 | 379 | C |
| 5 | `post_comments` | 1 | 668 | 230,915 | A (root array) |
| 6 | `reels_comments` | 1 | 12 | 3,259 | A |
| 7 | `liked_posts` | 1 | 45,026 | 10,995,834 | A |
| 8 | `liked_comments` | 1 | 177 | 43,293 | A |
| 9 | `story_likes` | 1 | 113 | 15,180 | A |
| 10 | `saved_posts` | 1 | 1,043 | 218,104 | A |
| 11 | `saved_collections` | 1 | 406 | 99,642 | A |
| 12 | `messages_inbox` | 112 | 28,231 msgs | 13,872,119 | D |
| 13 | `messages_requests` | 142 | 267 msgs | 186,875 | D |
| 14 | `secret_conversations` | 1 | 0 | 624 | custom |
| 15 | `followers` | 1 | 330 | 79,132 | A (root array) |
| 16 | `following` | 1 | 3,246 | 852,841 | A |
| 17 | `blocked_profiles` | 1 | 10 | 2,053 | A |
| 18 | `close_friends` | 1 | 4 | 1,091 | A |
| 19 | `follow_requests_you've_received` | 1 | 9 | 2,420 | A |
| 20 | `pending_follow_requests` | 1 | 14 | 3,746 | A |
| 21 | `recent_follow_requests` | 1 | 6 | 1,653 | A |
| 22 | `recently_unfollowed_profiles` | 1 | 9 | 2,406 | A |
| 23 | `removed_suggestions` | 1 | 1 | 315 | A |
| 24 | `restricted_profiles` | 1 | 3 | 832 | A |
| 25 | `hide_story_from` | 1 | 4 | 1,099 | A |
| 26 | `following_hashtags` | 1 | 13 | 3,472 | A |
| 27 | `synced_contacts` | 1 | 564 | 128,316 | A |
| 28 | `ads_viewed` | 1 | 643 | 113,840 | A |
| 29 | `posts_viewed` | 1 | 767 | 134,464 | A |
| 30 | `videos_watched` | 1 | 1,616 | 283,659 | A |
| 31 | `suggested_profiles_viewed` | 1 | 1,515 | 269,994 | A |
| 32 | `posts_you're_not_interested_in` | 1 | 1 | 289 | A |
| 33 | `advertisers_using_your_activity_or_information` | 1 | 3,364 | 647,372 | flat list |
| 34 | `recommended_topics` | 1 | 101 | 22,487 | A |
| 35 | `interest_categories` | 1 | 6 | 2,062 | B (root array) |
| 36 | `profile_based_in` | 1 | 1 | 267 | A |
| 37 | `last_known_location` | 1 | 1 | 735 | A |
| 38 | `locations_of_interest` | 1 | 2 | 742 | B |
| 39 | `other_categories_used_to_reach_you` | 1 | 1 | 1,685 | B |
| 40 | `your_activity_off_meta_technologies` | 1 | 14 | 4,521 | flat list |
| 41 | `your_activity_off_meta_technologies_settings` | 1 | 7 | 859 | B |
| 42 | `your_information_download_requests` | 1 | 10 | 941 | B |
| 43 | `your_link_history_settings` | 1 | 2 | 245 | B |
| 44 | `consents` | 1 | 2 | 286 | B |
| 45 | `link_history` | 1 | 15 | 12,001 | B (root array) |
| 46 | `profile_searches` | 1 | 2 | 691 | A |
| 47 | `word_or_phrase_searches` | 1 | 2 | 681 | A |
| 48 | `login_activity` | 1 | 101 | 93,046 | A |
| 49 | `logout_activity` | 1 | 15 | 14,306 | A |
| 50 | `password_change_activity` | 1 | 4 | 925 | A |
| 51 | `signup_details` | 1 | 1 | 840 | A |
| 52 | `profile_privacy_changes` | 1 | 3 | 763 | A |
| 53 | `profile_status_changes` | 1 | 18 | 10,178 | A |
| 54 | `personal_information` | 1 | 1 | 1,715 | A + media |
| 55 | `profile_changes` | 1 | 41 | 31,308 | A |
| 56 | `instagram_profile_information` | 1 | 1 | 1,091 | A |
| 57 | `professional_information` | 1 | 1 | 170 | A |
| 58 | `instagram_friend_map` | 1 | 1 | 366 | A |
| 59 | `note_interactions` | 1 | 1 | 273 | A |
| 60 | `notification_preferences` | 1 | 1 | 286 | A |
| 61 | `comments_allowed_from` | 1 | 1 | 280 | A |
| 62 | `show_exclusive_story_promo_setting` | 1 | 1 | 292 | A |
| 63 | `use_cross-app_messaging` | 1 | 1 | 411 | A |
| 64 | `your_muted_story_teaser_creators` | 1 | 1 | 274 | A |
| 65 | `devices` | 1 | 26 | 11,540 | A |
| 66 | `camera_information` | 1 | 1 | 714 | A |
| 67 | `polls` | 1 | 969 | 163,064 | A |
| 68 | `quizzes` | 1 | 43 | 7,129 | A |
| 69 | `questions` | 1 | 12 | 2,743 | A |
| 70 | `emoji_sliders` | 1 | 18 | 2,951 | A |
| 71 | `story_reaction_sticker_reactions` | 1 | 1 | 279 | A |
| 72 | `avatar_items` | 1 | 13 | 5,920 | flat list |
| 73 | `bug_reports` | 1 | 1 | 433 | A |
| 74 | `eligibility` | 1 | 1 | 482 | A |

---

## 2. Media and posts

### 2.1 `posts`

- **File:** `your_instagram_activity/media/posts_1.json` · 1 file · 29,570 B · ASCII
- **Top level:** `array[51]` — shape C, one object per post
- **Fields:**

| field | type | null | notes |
| --- | --- | --- | --- |
| `media` | array of 1 | no | one element per entry in this export |
| `media[].uri` | str | no | archive-root-relative media path |
| `media[].creation_timestamp` | int | no | Unix seconds |
| `media[].title` | str | no | caption; may be empty; mojibake-prone |
| `media[].cross_post_source.source_app` | str | no | 2-char app code |
| `media[].media_metadata.camera_metadata.has_camera_metadata` | bool | no | this export has no camera metadata |
| `media[].media_metadata.photo_metadata.exif_data` | array of object | no | 1–2 elements |
| `media[].media_metadata.photo_metadata.exif_data.latitude` | float | no | GPS |
| `media[].media_metadata.photo_metadata.exif_data.longitude` | float | no | GPS |
| `…exif_data.device_id` | str | no | |
| `…exif_data.software` | str | no | |
| `…exif_data.scene_capture_type` | str | no | |
| `…exif_data.source_type` | str | no | |
| `…exif_data.date_time_original` / `date_time_digitized` | str | no | local `YYYY:MM:DD HH:MM:SS` |

- **Join keys:** `media[].uri` → 51 files under `media/posts/`.
- **Unclear:** `cross_post_source.source_app` values; which EXIF element carries
  the GPS pair (the old parser takes the first with both, which works here).
- **Missing:** carousel children. All 51 entries have exactly one `media`
  element, so this export contains no multi-image posts to validate against.

### 2.2 `stories`

- **File:** `your_instagram_activity/media/stories.json` · 1 file · 113,313 B · ASCII
- **Top level:** `object` with one key `ig_stories` → `array[211]`
- **Fields:**

| field | type | null | notes |
| --- | --- | --- | --- |
| `ig_stories[].uri` | str | no | root-relative; 211 files, mostly `.jpg` and `.mp4` |
| `ig_stories[].creation_timestamp` | int | no | |
| `ig_stories[].title` | str | no | caption/sticker text |
| `ig_stories[].media_variants` | array | **not always present** | absent from most entries; shape unverified |
| `ig_stories[].dubbing_info` | array | no | present (empty in this export) |
| `ig_stories[].cross_post_source.source_app` | str | no | |
| `ig_stories[].media_metadata.video_metadata` | object | no | note: `video_metadata`, not `photo_metadata` |
| `…video_metadata.exif_data` | array of object | no | camera fields |
| `…video_metadata.music_genre` | str | no | instead of `title`-adjacent music fields |

- **Join keys:** `ig_stories[].uri`.
- **Unclear:** `media_variants` (present on some entries only) — is it an
  alternate encoding of the same media, or the story's full media set? And
  `dubbing_info`.

### 2.3 `archived_posts`

- **File:** `your_instagram_activity/media/archived_posts.json` · 1 file · 15,520 B · ASCII
- **Top level:** `object` key `ig_archived_post_media` → `array[27]`
- **Fields:** identical to `posts` (`media[]` with `uri`, `creation_timestamp`,
  `title`, `cross_post_source`, `media_metadata.photo_metadata.exif_data`), with
  `title` up to 174 chars.
- **Join keys:** `media[].uri` → 27 files under `media/archived_posts/`.
- **Unclear:** nothing — it is a structural copy of `posts`.

### 2.4 `profile_photos`

- **File:** `your_instagram_activity/media/profile_photos.json` · 1 file · 379 B · ASCII
- **Top level:** `object` key `ig_profile_picture` → `array[1]`
- **Fields:** `creation_timestamp` int, `title` str (empty), `uri` str,
  `cross_post_source.source_app` str,
  `media_metadata.camera_metadata.has_camera_metadata` bool.

### 2.5 `post_comments`

- **File:** `your_instagram_activity/comments/post_comments_1.json` · 1 file · 230,915 B · ASCII
- **Top level:** `array[668]` — shape A entries at the root
- **Fields:**

| field | type | null | notes |
| --- | --- | --- | --- |
| `string_map_data.Comment.value` | str | no | comment text (mojibake-prone) |
| `string_map_data.Media Owner.value` | str | no | username |
| `string_map_data.Time.timestamp` | int | no | Unix seconds |
| `media_list_data[0].uri` | str | no | **always the empty string** |

- **Join keys:** `Media Owner.value` → a username in `following`/`followers`.
- **Unclear:** why `media_list_data` exists with a single empty `uri`. It carries
  no usable media link.

### 2.6 `reels_comments`

- Same shape as `post_comments` (12 entries), nested under
  `comments_reels_comments` instead of at the root. No `media_list_data`.

### 2.7 `liked_posts`

- **File:** `your_instagram_activity/likes/liked_posts.json` · 1 file · 10,995,834 B (the largest JSON) · ASCII
- **Top level:** `object` key `likes_media_likes` → `array[45,026]`
- **Fields:** `title` str (creator username), `string_list_data[]` with
  `href` str, `timestamp` int, `value` str.
- **Join keys:** `title` / `string_list_data[].value` (username);
  `string_list_data[].href` (a profile URL).
- **Unclear:** `href` and `value` are both present but neither is the liked
  post; the post itself is not identified beyond the owner. Worth confirming.

### 2.8 `liked_comments` / `story_likes`

Same shape as `liked_posts`. `story_likes` has no `href`.
177 and 113 entries respectively.

### 2.9 `saved_posts`

- **File:** `your_instagram_activity/saved/saved_posts.json` · 1 file · 218,104 B · ASCII
- **Top level:** `object` key `saved_saved_media` → `array[1,043]`
- **Fields:** `title` str (owner username),
  `string_map_data["Saved on"].{href, timestamp}`, `media_list_data[]` (empty).
- **Join keys:** `title` (username).
- **Unclear:** the saved post itself is not referenced — only its owner.

### 2.10 `saved_collections`

- **Top level:** `object` key `saved_saved_collections` → `array[406]`
- **Fields:** `title` str, `string_map_data` with keys
  `Added Time`, `Creation Time`, `Update Time` (each `.timestamp`) and
  `Name` (`.{href, value}`).
- **Join keys:** `Name.value` is a **collection name**, not a username.
- **Unclear:** how a saved post maps to a collection. No membership list was
  found in this file.

---

## 3. Messages

The heaviest section, and the one governed by AGENTS.md §1.7: it contains text
written by people who never chose to use this tool. **Build it deliberately.**

### 3.1 `messages_inbox`

- **Files:** `your_instagram_activity/messages/inbox/<thread>/message_1.json`
  · 112 files · 112 threads · 13,872,119 B · ASCII
- **Top level:** shape D — an object, never an array

| field | type | null | notes |
| --- | --- | --- | --- |
| `participants` | array of `{name: str}` | no | 2 per thread in this export (224 total) |
| `messages` | array of message | no | 28,231 total; 1–7,797 per thread |
| `title` | str | no | thread title (often a username) |
| `thread_path` | str | no | folder path of this thread |
| `is_still_participant` | bool | no | |
| `magic_words` | array | no | **always empty** in this export |
| `is_pending` | bool | **absent** | only in `message_requests` |
| `joinable_mode` | object | **absent** | only in `message_requests` |

**Message object** (key presence across all 28,498 messages):

| field | type | present in | null |
| --- | --- | --- | --- |
| `sender_name` | str | 28,498 / 28,498 | no |
| `timestamp_ms` | int | 28,498 / 28,498 | no |
| `is_geoblocked_for_viewer` | bool | 28,498 | no |
| `is_unsent_image_by_messenger_kid_parent` | bool | 28,496 | no |
| `content` | str | 27,633 | no |
| `share` | object | 11,157 | no |
| `reactions` | array | 1,022 | no |
| `photos` | array | 74 | no |
| `call_duration` | int | 19 | no |
| `videos` | array | 7 | no |
| `audio_files` | array | 5 | no |
| `is_unsent` | bool | 1 | no |

- **`share` object:** `link` (11,132 of 11,157), `share_text` (10,932),
  `original_content_owner` (10,893), `profile_share_username` (30),
  `profile_share_name` (30). A share may have none of these.
- **`reactions[]`:** `{reaction: str, actor: str, timestamp?: int}` —
  `timestamp` present on only 536 of 1,022.
- **`photos[]`:** `{uri: str, creation_timestamp?: int}` — the timestamp is
  missing on 4. **FACT:** those 4 are exactly the 4 files on disk with **no
  file extension** (all JPEG). Extension-sniffing breaks precisely here.
- **`videos[]`:** `{uri: str, creation_timestamp?: int}` — timestamp missing on 3 of 7.
- **`audio_files[]`:** `{uri: str, creation_timestamp: int}`.
- **`call_duration`:** appears only on messages that represent a call. There is
  no `call_type` field in this export to say audio or video.
- **Join keys:** `thread_path`; `sender_name` (a display name, **not** a
  username, and not guaranteed unique); `photos[].uri` etc. are
  **thread-directory relative**.
- **Unclear:** `is_unsent_image_by_messenger_kid_parent` — missing from 2
  messages, meaning unknown. `magic_words` is always empty, so its element
  shape is unknown.

### 3.2 `messages_requests`

- **Files:** `…/messages/message_requests/<thread>/message_1.json` · 142 files · 186,875 B · ASCII
- **Top level:** shape D plus two extra keys:

| extra field | type | present in |
| --- | --- | --- |
| `is_pending` | bool | 142 / 142 |
| `joinable_mode` | `{link: str, mode: int}` | 62 / 142 |

- 267 messages total, 1–23 per thread. `participants` 2–31 (group requests).
- Same message object as §3.1, except no `is_unsent` and no `call_duration`.
- **Join keys:** `thread_path`.
- **Unclear:** `joinable_mode.mode` integer values are undocumented.

### 3.3 `secret_conversations`

- **File:** `your_instagram_activity/messages/secret_conversations.json` · 1 file · 624 B · ASCII
- **Top level:** `object` key `ig_secret_conversations`
- **Present keys:** `armadillo_devices` → array of
  `{device_manufacturer: str, device_model: str, device_os_version: str,
  device_type: str, last_active_time: int, last_connected_ip: str}`; and
  `calls` → array (empty here).
- **Contains IP addresses.** Treat as security data.
- **Unclear:** `armadillo_devices` is a device list, apparently belonging to the
  encrypted-conversation layer, not to a conversation. `calls` element shape is
  unknown (empty).

---

## 4. Connections

All of these are shape A. They share one entry template:

| field | type | null |
| --- | --- | --- |
| `title` | str | no (may be empty) |
| `string_list_data[]` | array of `{href: str, timestamp: int, value: str}` | no |
| `media_list_data` | array (empty) | no |

`value` is the username; `href` is the profile URL; `timestamp` is when the
relationship began. Where a category deviates, it is noted.

| # | Category | File | Entries | Deviation from the template |
| --- | --- | --- | --- | --- |
| 4.1 | `followers` | `connections/followers_and_following/followers_1.json` | 330 | **root is an array**, not an object |
| 4.2 | `following` | `…/following.json` (key `relationships_following`) | 3,246 | — |
| 4.3 | `blocked_profiles` | `…/blocked_profiles.json` (`relationships_blocked_users`) | 10 | no `value` in `string_list_data` |
| 4.4 | `close_friends` | `…/close_friends.json` (`relationships_close_friends`) | 4 | — |
| 4.5 | `follow_requests_you've_received` | `…/follow_requests_you've_received.json` (`relationships_follow_requests_received`) | 9 | — |
| 4.6 | `pending_follow_requests` | `…/pending_follow_requests.json` (`relationships_follow_requests_sent`) | 14 | outgoing requests, despite the name |
| 4.7 | `recent_follow_requests` | `…/recent_follow_requests.json` (`relationships_permanent_follow_requests`) | 6 | — |
| 4.8 | `recently_unfollowed_profiles` | `…/recently_unfollowed_profiles.json` (`relationships_unfollowed_users`) | 9 | — |
| 4.9 | `removed_suggestions` | `…/removed_suggestions.json` (`relationships_dismissed_suggested_users`) | 1 | — |
| 4.10 | `restricted_profiles` | `…/restricted_profiles.json` (`relationships_restricted_users`) | 3 | — |
| 4.11 | `hide_story_from` | `…/hide_story_from.json` (`relationships_hide_stories_from`) | 4 | — |
| 4.12 | `following_hashtags` | `…/following_hashtags.json` (`relationships_following_hashtags`) | 13 | `value` is a hashtag, not a username |

- **Join keys:** `value` / `title` = username. These are the authoritative
  people list; `following` + `followers` are the only categories with enough
  coverage to be a user directory.
- **Unclear:** whether `following` (3,246) includes accounts that no longer
  exist; whether `title` and `string_list_data[].value` can disagree after a
  rename (they are read from the same record, so probably not).

### 4.13 `synced_contacts`

- **File:** `connections/contacts/synced_contacts.json` · 564 entries · 128,316 B · ASCII
- **Top level:** `object` key `contacts_contact_info` → `array[564]` (shape A)
- **Fields:** `string_map_data` with keys `Contact Information` (`.value` — a
  phone number), `First Name` (`.value`), `Last Name` (`.value`).
- **Join keys:** `Contact Information` = phone number.
- **Privacy:** this is **third-party personal data** — names and phone numbers
  of people who never installed anything. Highest-sensitivity list in the export
  alongside messages.
- **Unclear:** there is no link from a contact to an Instagram account.

---

## 5. Activity, advertising, interests

### 5.1 Impression logs — `ads_viewed`, `posts_viewed`, `videos_watched`

Shape A, one entry per impression. Fields:

| field | type | notes |
| --- | --- | --- |
| `string_map_data.Author.value` | str | username of the account whose content was seen |
| `string_map_data.Author.href` / `.timestamp` | str / int | present |
| `string_map_data.Time.value` | str | **localised display string** |
| `string_map_data.Time.timestamp` | int | Unix seconds — use this |

643 / 767 / 1,616 entries. **Join keys:** `Author.value` → username.

### 5.2 `suggested_profiles_viewed`

Same as §5.1 but the key is `Username` instead of `Author`. 1,515 entries.

### 5.3 `posts_you're_not_interested_in`

Shape A with `string_list_data[{href, timestamp, value}]`. 1 entry.

### 5.4 `advertisers_using_your_activity_or_information`

- **Top level:** `object` key `ig_custom_audiences_all_types` → `array[3,364]`
- **Entry:** flat, not an envelope:
  `{advertiser_name: str, has_data_file_custom_audience: bool,
  has_in_person_store_visit: bool, has_remarketing_custom_audience: bool}`
- **Join keys:** none. **Unclear:** nothing.

### 5.5 `recommended_topics`

`array[101]`, shape A. `string_map_data.Name.{href, timestamp, value}` +
`media_map_data` (empty) + `title`.

### 5.6 `interest_categories`

- **Top level:** **root array**[6] — shape B objects.
- **Fields:** `fbid: str`, `timestamp: int`, `media: []`,
  `label_values[{label: str, value: str, timestamp_value: int}]`.
- **Unclear:** what `fbid` identifies.

### 5.7 `profile_based_in`

`array[1]`, shape A. `string_map_data["City Name"].value` (a city) +
`.href` / `.timestamp`. **Inferred**, not user-declared.

### 5.8 `last_known_location`

`array[1]`, shape A. `string_map_data` keys:
`GPS Time Uploaded`, `Imprecise Latitude`, `Imprecise Longitude`,
`Precise Latitude`, `Precise Longitude` — every one is a **string**, not a
number (all single-character values here). Must be parsed with care.

### 5.9 Shape B files

Everything below is `{fbid, media: [], label_values: […], timestamp?}`.

| Category | `label_values[]` fields | Extra | Unclear |
| --- | --- | --- | --- |
| `locations_of_interest` | `label`, `value`, `vec[{value}]` | — | `vec` contents are opaque tokens |
| `other_categories_used_to_reach_you` | `label`, `vec[{value}]` | — | no `value`; the meaning lives in `vec` |
| `your_activity_off_meta_technologies_settings` | `label`, `value`, `timestamp_value` | `timestamp` | — |
| `your_information_download_requests` | `label`, `value`, `timestamp_value` | `timestamp` | `value` is a single char here |
| `your_link_history_settings` | `label`, `timestamp_value` | `timestamp` | **no `value`** — the label is the setting |
| `consents` | `label`, `timestamp_value` | `timestamp` | **no `value`** |
| `link_history` (root array) | `label`, `value` | `timestamp` | `fbid` is 68 chars here, 15–17 elsewhere |

### 5.10 `your_activity_off_meta_technologies`

**Root:** `object` key `apps_and_websites_off_meta_activity` → `array[14]`, flat entries:
`{name: str, events: [{id: int, timestamp: int, type: str}]}`.
**Join keys:** none. **Unclear:** the vocabulary of `events[].type`.

### 5.11 Search history

`profile_searches` (2) and `word_or_phrase_searches` (2), shape A:
`string_map_data.Search.{href, timestamp, value}` + `string_map_data.Time`.

---

## 6. Security, account history, profile

### 6.1 `login_activity` (101) and `logout_activity` (15)

Shape A. `string_map_data` keys, each `.{href, timestamp, value}`:
`Cookie Name`, `IP Address`, `Language Code`, `Port`, `Time`, `User Agent`.
`title` is a short summary string.

- **Contains IP addresses and user-agent strings.** Security-sensitive.
- **Unclear:** `Cookie Name` values; whether `Port` is client or server side.

### 6.2 `password_change_activity` (4)

`string_map_data.Time` only, plus `title`.

### 6.3 `signup_details` (1)

`string_map_data`: `Device`, `Email`, `IP Address`, `Phone Number`, `Time`,
`Username` — each `.{href, timestamp, value}`.
**Contains email and phone number.** Highest-sensitivity single record.

### 6.4 `profile_privacy_changes` (3) / `profile_status_changes` (18)

- privacy: `string_map_data.Time` + `title`.
- status: `Activation Type`, `Automated`, `Inactivation Reason`, `Time`.
- **Unclear:** `Automated` is a string (`value` max length 6) whose vocabulary
  is unknown.

### 6.5 `personal_information`

- **Top level:** `array[1]` under `profile_user`.
- **Two payloads in one entry:**
  - `media_map_data["Profile Photo"]` — a full shape-C media record
    (`uri`, `creation_timestamp`, `title`, `cross_post_source`, `media_metadata`).
  - `string_map_data` keys: `Bio`, `Date of birth`, `Email`,
    `Emoji Pong High Score`, `Gender`, `Phone Confirmation Method`,
    `Phone Confirmed`, `Phone Number`, `Private Account`, `Username`.
- **FACT:** the profile photo `uri` is the **same file** as
  `profile_photos.ig_profile_picture[0].uri`. One of only two denormalised
  copies found in the export.
- **Unclear:** `Emoji Pong High Score` is a game stat; `value` max length 1.

### 6.6 `profile_changes` (41)

`string_map_data`: `Change Date`, `Changed`, `New Value`, `Previous Value`.
**Unclear:** the vocabulary of `Changed` (e.g. which profile field).

### 6.7 `instagram_profile_information` (1)

`string_map_data`: `Contact Syncing`, `First Close Friends Story Time`,
`First Country Code`, `First Story Time`, `Has Shared Live Video`,
`Last Login`, `Last Logout`, `Last Story Time`.

### 6.8 `professional_information` (1), `instagram_friend_map` (1), `note_interactions` (1)

- professional: `string_map_data` **empty**, `title` only.
- friend map: `Incoming requests`, `Outgoing requests` (`.value`).
- note interactions: `Last Notes Seen Time`.

### 6.9 `devices` (26) and `camera_information` (1)

- devices: `string_map_data.Last Login.{href, timestamp, value}`,
  `string_map_data.User Agent.{href, timestamp, value}` + `title`.
- camera: `Device ID`, `Supported SDK Versions` (a 323-char string).

---

## 7. Settings and story interactions

| Category | Entries | Fields | Unclear |
| --- | --- | --- | --- |
| `notification_preferences` | 1 | `string_map_data{Channel, Type, Value}` (`.value` only) | — |
| `comments_allowed_from` | 1 | `string_map_data["Comments Allowed From"].{href, timestamp, value}` | — |
| `show_exclusive_story_promo_setting` | 1 | `string_map_data["Exclusive Story Promo Setting"].{href, timestamp, value}` | — |
| `use_cross-app_messaging` | 1 | `string_map_data{Time Upgraded, Upgraded To Cross-App Messaging}` | — |
| `your_muted_story_teaser_creators` | 1 | `string_map_data["Muted Creators"].{href, timestamp, value}` | `value` is empty here |
| `polls` | 969 | `title` + `string_list_data[{timestamp, value}]` | `title` is the poll prompt; option chosen is unknown |
| `quizzes` | 43 | same as polls | — |
| `emoji_sliders` | 18 | same as polls | — |
| `questions` | 12 | `title` + `string_list_data[{href, timestamp, value}]` + `media_list_data` | — |
| `story_reaction_sticker_reactions` | 1 | same as questions | — |

**Unclear (story interactions):** none of these categories references *which
story* the interaction happened on. There is no story id in the entries.

### 7.1 `avatar_items` (13)

`ig_avatar_marketplace_avatar_items[]` →
`{acquisition_time: int, item: str (357 chars, not JSON, not a path),
type: str}`. **Unclear:** what `item` contains.

### 7.2 `bug_reports` (1) and `eligibility` (1)

- bug reports: `string_map_data{Bug Description, Submission Time}`.
- eligibility: `string_map_data{Decision, Product Name, Reason}`.

---

## 8. Relationships between categories

There are no foreign keys. These are the only joinable edges found.

| From | Field | To | Confidence |
| --- | --- | --- | --- |
| `posts`, `stories`, `archived_posts`, `profile_photos`, `personal_information` | `uri` | media files under `media/` | **certain** — 100% resolve |
| `messages_*` | `photos/videos/audio_files[].uri` | media files next to the thread JSON | **certain** — 100% resolve |
| `personal_information` × `profile_photos` | `uri` | the **same** `media/other/` file | **certain** — the only duplicate |
| `liked_posts`, `liked_comments`, `story_likes`, `saved_posts`, `post_comments`, `reels_comments`, `ads_viewed`, `posts_viewed`, `videos_watched`, `suggested_profiles_viewed` | username field (`title`, `value`, `Author`, `Username`, `Media Owner`) | `following` / `followers` usernames | **likely** — by string equality; names change |
| `post_comments` / `reels_comments` | `Media Owner.value` | the post that was commented on | **weak** — owner only, no post id |
| `saved_posts` × `saved_collections` | — | — | **none found** — no membership list |
| `story_likes`, `polls`, `quizzes`, `questions`, `emoji_sliders`, `story_reaction_sticker_reactions` | — | `stories` | **none found** — no story id anywhere |
| `followers` / `following` | `value` | `synced_contacts` phone numbers | **none found** |

### 8.1 Denormalised copies

Only one true duplicate exists: the profile photo URI, in both
`personal_information` and `profile_photos`.

Everything else that looks like duplication is **parallel**: `posts` and
`archived_posts` share a schema but hold different records; `liked_posts` and
`saved_posts` are different actions, not copies.

The export is otherwise heavily **normalised by omission**: actions point at a
person but not at the thing the person did.

---

## 9. Unexpected / unclassified

Everything in the export fit a category. These are the things inside categories
that did **not** fit a clean model and must not be silently dropped.

| # | What | Where | Why it is odd |
| --- | --- | --- | --- |
| 1 | 4 media files with **no extension** | message thread `photos/` folders | All are JPEG. They are exactly the 4 `photos[]` entries whose `creation_timestamp` is missing. Extension-based typing and extension-based MIME guessing both fail here. |
| 2 | `post_comments[].media_list_data[0].uri` is always `""` | `post_comments_1.json`, all 668 entries | An array that exists solely to carry an empty string. Not a media reference. |
| 3 | `avatar_items[].item` is a 357-character opaque string | `avatars_store/avatar_items.json` | Not JSON, not a path, not a URL. Content unknown, preserved in `raw`. |
| 4 | `secret_conversations` holds device records, not conversations | `messages/secret_conversations.json` | Keys are `armadillo_devices` and `calls`; `calls` is empty. Contains IP addresses. |
| 5 | `media/other/` contains the profile photo | `media/other/` | The folder name suggests "miscellaneous"; in fact it holds the one profile image, referenced twice. |
| 6 | **No export-format version marker** | whole archive | There is no manifest, version file or top-level metadata JSON. AGENTS.md §6 requires every schema to name the export format version it targets, and this archive contains nothing to pin it to. |
| 7 | One JSON file per thread | `messages/**` | The old Go parser handles `message_2.json` etc.; this export has none. Multi-file threads remain unvalidated. |
| 8 | `is_pending` and `joinable_mode` only in `message_requests` | 142 and 62 threads | The thread object is not the same shape in both message families. |
| 9 | `magic_words` always `[]` | 254 threads | Element shape unknown. |
| 10 | `label_values[].vec` nests a second value array | 4 shape-B files | Shape differs per file; the least predictable structure in the export. |

### 9.1 Data the export does not contain

The old CLAUDE.md promised views for these. **FACT:** no file matching any of
them exists in this export:

- recently deleted / recently deleted posts
- guide posts
- autofill information
- shopping history
- ads **clicked** (only `ads_viewed` exists)
- saved reels (as a separate file; `saved_posts` may include them)

Do not build a view against data that is not there.

---

## 10. Questions the files cannot answer

Each of these needs the owner's knowledge. Do not guess.

| # | Question | File | JSON path |
| --- | --- | --- | --- |
| Q1 | What does `item` contain — an asset id, a JSON blob of avatar parts, something else? | `avatars_store/avatar_items.json` | `ig_avatar_marketplace_avatar_items[].item` |
| Q2 | Why does `media_list_data` exist on every comment with one empty `uri`? Is the commented-on media ever included? | `comments/post_comments_1.json` | `[].media_list_data[0].uri` |
| Q3 | What are the possible values of `cross_post_source.source_app`? | `media/posts_1.json` | `[].media.source_app` |
| Q4 | Is `media_variants` a re-encode of the same story, or additional media? | `media/stories.json` | `ig_stories[].media_variants` |
| Q5 | What does `dubbing_info` hold? | `media/stories.json` | `ig_stories[].dubbing_info` |
| Q6 | What are the integer values of `joinable_mode.mode`? | `messages/message_requests/**` | `joinable_mode.mode` |
| Q7 | What does `is_unsent_image_by_messenger_kid_parent` mean, and why is it missing from 2 messages? | `messages/**` | `messages[].is_unsent_image_by_messenger_kid_parent` |
| Q8 | Is a call an audio call or a video call? The export records only a duration. | `messages/**` | `messages[].call_duration` |
| Q9 | What does `armadillo_devices` describe, and whose devices are they? | `messages/secret_conversations.json` | `ig_secret_conversations.armadillo_devices` |
| Q10 | What is the element shape of `calls`? (empty here) | `messages/secret_conversations.json` | `ig_secret_conversations.calls` |
| Q11 | What does `magic_words` hold when non-empty? | `messages/**` | `magic_words` |
| Q12 | What vocabulary does `Automated` use? | `security_and_login_information/login_and_profile_creation/profile_status_changes.json` | `[].string_map_data.Automated.value` |
| Q13 | What values can `Changed` take in profile changes? | `personal_information/personal_information/profile_changes.json` | `[].string_map_data.Changed.value` |
| Q14 | What do the opaque tokens inside `vec[].value` represent? | `ads_information/ads_and_topics/locations_of_interest.json` | `label_values[].vec[].value` |
| Q15 | What does `fbid` identify, and why is it 68 chars in `link_history` but 15–17 elsewhere? | `logged_information/link_history/link_history.json` | `[].fbid` |
| Q16 | What do `events[].type` values mean? | `apps_and_websites_off_instagram/apps_and_websites/your_activity_off_meta_technologies.json` | `[].events[].type` |
| Q17 | Is `string_list_data[].href` on `liked_posts` ever the liked post's permalink, or always the owner's profile? | `your_instagram_activity/likes/liked_posts.json` | `[].string_list_data[].href` |
| Q18 | How does a saved post belong to a saved collection? No membership list was found. | `your_instagram_activity/saved/*.json` | — |
| Q19 | How does a story interaction (poll, quiz, question) link back to the story? No story id was found. | `your_instagram_activity/story_interactions/*.json` | — |
