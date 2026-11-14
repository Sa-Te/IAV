# Completeness — what is rendered, what is missing, and what a visitor sees

Measured from `archive-2/` and the production build on 2026-11-14 (M26), before
the front-door work. This is an audit, not a feature list. It contains category
ids, key names, counts and route strings only; no personal values.

The method: run the app's own ingest over the archive, take one record per
present category, collect its field names, and compare them with the screen the
registry/`screenOf` assigns. A field is **named** when a screen reads it,
**raw** when the category's screen ends in the raw-JSON disclosure (or is the raw
tree), and **nowhere** when neither is true.

## 1a. Category coverage

Counts first:

| Measure | Count |
| --- | ---: |
| Registered categories (excluding the unrecognised bucket) | 88 |
| Present in `archive-2/` | 73 |
| Present with a real screen | **72** |
| Present with the generic table/tree | **1** (`synced_contacts`, a gated contact table) |
| Absent | 15 |
| Registered but unmeasured | **1** (`reels`, absent, name-only) |
| Present categories with a raw disclosure/tree | 70 |
| Present categories without one | **3** (`messages_inbox`, `messages_requests`, `synced_contacts`) |

The unrecognised bucket is present by design (ADR 0002) and is not one of the 88
categories. `registered-unmeasured` is a subset of absent, not a fourth total.

| Tier | Category | Present | Screen | Status |
| --- | --- | --- | --- | --- |
| T1 | `notification_preferences` | yes | settings | parsed + rendered |
| T1 | `comments_allowed_from` | no | — | not started — not present in the current baseline |
| T1 | `show_exclusive_story_promo_setting` | no | — | not started — not present in the current baseline |
| T1 | `use_cross-app_messaging` | no | — | not started — not present in the current baseline |
| T1 | `professional_information` | no | — | not started — not present in the current baseline |
| T1 | `note_interactions` | no | — | not started — not present in the current baseline |
| T1 | `eligibility` | yes | settings | parsed + rendered |
| T1 | `bug_reports` | yes | settings | parsed + rendered |
| T1 | `instagram_profile_information` | yes | settings | parsed + rendered |
| T1 | `instagram_friend_map` | yes | settings | parsed + rendered |
| T1 | `camera_information` | no | — | not started — not present in the current baseline |
| T1 | `your_muted_story_teaser_creators` | no | — | not started — not present in the current baseline |
| T1 | `your_link_history_settings` | yes | settings | parsed + rendered |
| T1 | `consents` | yes | settings | parsed + rendered |
| T1 | `your_activity_off_meta_technologies_settings` | yes | settings | parsed + rendered |
| T1 | `your_information_download_requests` | yes | settings | parsed + rendered |
| T1 | `avatar_items` | yes | avatar | parsed + rendered |
| T1 | `devices` | no | — | not started — not present in the current baseline |
| T1 | `ad_preferences` | yes | settings | parsed + rendered |
| T1 | `device_camera_effects_support` | yes | device | parsed + rendered |
| T2 | `posts_you're_not_interested_in` | yes | event | parsed + rendered |
| T2 | `other_categories_used_to_reach_you` | yes | name-list | parsed + rendered |
| T2 | `profile_based_in` | yes | settings | parsed + rendered |
| T2 | `last_known_location` | yes | settings | parsed + rendered |
| T2 | `signup_details` | yes | settings | parsed + rendered |
| T2 | `personal_information` | yes | profile | parsed + rendered |
| T2 | `profile_searches` | yes | event | parsed + rendered |
| T2 | `word_or_phrase_searches` | yes | event | parsed + rendered |
| T2 | `profile_privacy_changes` | yes | event | parsed + rendered |
| T2 | `password_change_activity` | no | — | not started — not present in the current baseline |
| T2 | `interest_categories` | no | — | not started — not present in the current baseline |
| T2 | `locations_of_interest` | yes | name-list | parsed + rendered |
| T2 | `logout_activity` | yes | event | parsed + rendered |
| T2 | `your_activity_off_meta_technologies` | no | — | not started — not present in the current baseline |
| T2 | `link_history` | yes | event | parsed + rendered |
| T2 | `profile_status_changes` | yes | event | parsed + rendered |
| T2 | `profile_changes` | yes | event | parsed + rendered |
| T2 | `recommended_topics` | no | — | not started — not present in the current baseline |
| T2 | `login_activity` | yes | event | parsed + rendered |
| T2 | `ads_viewed` | no | — | not started — not present in the current baseline |
| T2 | `posts_viewed` | yes | event | parsed + rendered |
| T2 | `suggested_profiles_viewed` | yes | event | parsed + rendered |
| T2 | `videos_watched` | yes | event | parsed + rendered |
| T2 | `advertisers_using_your_activity_or_information` | yes | name-list | parsed + rendered |
| T2 | `posts_you're_interested_or_not_interested_in` | yes | event | parsed + rendered |
| T2 | `subscription_for_no_ads` | yes | settings | parsed + rendered |
| T2 | `profile_activity` | yes | event | parsed + rendered |
| T2 | `stories_viewed` | yes | event | parsed + rendered |
| T2 | `your_ownership_of_digital_items` | yes | event | parsed + rendered |
| T3 | `profile_photos` | yes | photos | parsed + rendered |
| T3 | `story_reaction_sticker_reactions` | yes | event | parsed + rendered + tested |
| T3 | `reels_comments` | yes | event | parsed + rendered + tested |
| T3 | `questions` | yes | event | parsed + rendered + tested |
| T3 | `emoji_sliders` | yes | event | parsed + rendered + tested |
| T3 | `archived_posts` | yes | gallery (category route: tree) | parsed + rendered + tested |
| T3 | `quizzes` | yes | event | parsed + rendered + tested |
| T3 | `posts` | yes | gallery (category route: tree) | parsed + rendered + tested |
| T3 | `reels` | no | — | registered, unmeasured — absent from the current baseline |
| T3 | `story_likes` | yes | event | parsed + rendered + tested |
| T3 | `liked_comments` | yes | event | parsed + rendered + tested |
| T3 | `stories` | yes | gallery (category route: tree) | parsed + rendered + tested |
| T3 | `saved_collections` | yes | saved | parsed + rendered + tested |
| T3 | `post_comments` | yes | event | parsed + rendered + tested |
| T3 | `polls` | yes | event | parsed + rendered + tested |
| T3 | `saved_posts` | yes | saved | parsed + rendered + tested |
| T3 | `liked_posts` | yes | event | parsed + rendered + tested |
| T3 | `instants_interactions` | yes | event | parsed + rendered + tested |
| T3 | `other_content` | yes | event | parsed + rendered + tested |
| T4 | `secret_conversations` | no | — | not started — not present in the current baseline; muted sidebar row |
| T4 | `removed_suggestions` | yes | people | parsed + rendered + tested |
| T4 | `restricted_profiles` | yes | people | parsed + rendered + tested |
| T4 | `hide_story_from` | yes | people | parsed + rendered + tested |
| T4 | `close_friends` | yes | people | parsed + rendered + tested |
| T4 | `recent_follow_requests` | yes | people | parsed + rendered + tested |
| T4 | `follow_requests_you've_received` | yes | people | parsed + rendered + tested |
| T4 | `threads_follow_requests_received` | yes | people | parsed + rendered + tested |
| T4 | `recently_unfollowed_profiles` | yes | people | parsed + rendered + tested |
| T4 | `blocked_profiles` | yes | people | parsed + rendered + tested |
| T4 | `following_hashtags` | yes | tags | parsed + rendered + tested |
| T4 | `pending_follow_requests` | yes | people | parsed + rendered + tested |
| T4 | `followers` | yes | people | parsed + rendered + tested |
| T4 | `synced_contacts` | yes | table | parsed + rendered + tested |
| T4 | `following` | yes | people | parsed + rendered + tested |
| T5 | `messages_requests` | yes | thread list + conversation | parsed + rendered + tested (M24: attachments, provenance, search behind the T5 gate) |
| T5 | `messages_inbox` | yes | thread list + conversation | parsed + rendered + tested (M24: attachments, provenance, search behind the T5 gate) |
| T5 | `ai_conversations` | yes | ai | parsed + rendered + tested |
| T5 | `checkout_payment_information` | yes | settings | parsed + rendered + tested |
| T5 | `threads_viewed` | yes | event | parsed + rendered + tested |


## 1b. The raw-data check

Every present category was sampled. The 70 with a raw disclosure or raw tree have
no field rendered nowhere: a field the named screen does not read is still in the
closed raw JSON. The three without one are different.

### Message categories — fields rendered nowhere

`messages_inbox` and `messages_requests` render a thread list and a conversation.
The conversation reads `sender_name`, `timestamp_ms`, `content` and the attachment
`uri`; the thread list reads `participants[].name`, the message count and the
newest date. Nothing else is on screen, and `ThreadList`/`ThreadConversation`
have no raw disclosure. The field vocabulary was taken from one thread and
confirmed against all 264 message files.

| Field path | Messages carrying it | Render |
| --- | ---: | --- |
| `title` | 264 / 264 threads | nowhere |
| `is_still_participant` | 264 / 264 | nowhere |
| `thread_path` | 264 / 264 | nowhere |
| `magic_words` | 264 / 264 | nowhere |
| `is_pending` | 142 / 264 | nowhere |
| `joinable_mode` | 65 / 264 | nowhere |
| `joinable_mode.mode`, `joinable_mode.link` | 65 / 264 | nowhere |
| `messages[].is_geoblocked_for_viewer` | 33,870 | nowhere |
| `messages[].is_unsent_image_by_messenger_kid_parent` | 33,867 | nowhere |
| `messages[].share` | 12,346 | nowhere |
| `messages[].share.link`, `.share_text`, `.original_content_owner` | 12,346 | nowhere |
| `messages[].reactions` | 1,178 | nowhere |
| `messages[].reactions[].reaction`, `.actor` | 1,178 | nowhere |
| `messages[].call_duration` | 34 | nowhere |
| `messages[].is_unsent` | 1 | nowhere |
| `messages[].photos[].creation_timestamp` | 90 attachments (photo/video/audio) | nowhere |

`content` is named, but when it is an attachment placeholder with no media the
screen renders the explicit “Attachment not included in this export.” note rather
than the literal. That is deliberate (docs/T5-DESIGN.md §3.3), not a dropped
field. The attachment container keys (`photos`, `videos`, `audio_files`, `gifs`)
are structural; their `uri` is rendered.

### Synced contacts — no field nowhere, but no raw view either

`synced_contacts` renders the generic table with columns taken from every
`string_map_data` label: `First Name`, `Last Name`, `Contact Information`,
`Imported Time`. A new label becomes a new column, so content labels are not
dropped. The envelope keys (`contacts_contact_info`, `string_map_data`) are
structural. There is no raw disclosure on this screen; the data is a contact
table behind the gate.

### Media categories — named fields plus a raw tree

`posts`, `stories` and `archived_posts` are assigned to the gallery. The gallery
names the media path, caption and date; every other media field is reachable in
the generic raw tree at `/categories/<id>` (the screen choice for those ids is
the tree). None is nowhere. `profile_photos` and `personal_information` have the
raw disclosure.

## 1c. Cross-category features

| Feature | Exists? | Where / what it does |
| --- | --- | --- |
| Batch download of selected media + ZIP of a selection | **No** | No selection state in Grid/Timeline; no `zipSync` in `apps/web/src`. ADR 0020 permits it: `fflate` is already a dependency. |
| Next/previous stepping in detail | **No** | `MediaDetail` receives `index`/`total` and renders “n of m”, but has only Close; no prev/next handlers. |
| Search | **Yes, messages only** | `ThreadList` search over `messages_inbox`/`messages_requests` bodies: case/diacritic/whitespace-insensitive, in-memory after the T5 reveal, with snippet and jump. No search over posts, stories, saved posts or other lists. |
| Followers/following diff | **Yes** | `/connections`, linked from the sidebar’s Galleries group and the T4 tier page; ungated. |
| Print and CSV | **Yes** | Conversation view; both controls exist only after the T5 reveal. Print is a stylesheet; CSV is an RFC 4180 blob. |
| Cyclone text-size/hover/pause controls | **Partial** | Hover highlight, drag/wheel/pointer tilt, arrow keys/Enter, Space pause and reduced-motion opt-in exist. No text-size control. |
| Cyclone loading state | **Partial** | “Reading the archive…” while the list loads. After the list is ready there is no explicit “preparing textures” state or count; a blank canvas can persist until the first frame or the empty-scene deadline. |
| `note_and_repost_interactions.json` | **No** | Still in the unrecognised bucket; no registry row. The M22 comment in `tier3.ts` records why it must not fall back into `posts`. |

## 1d. Production build

Built from the current tree:

```
/ 
/posts
/stories
/archived
/cyclone
/categories
/connections
/categories/:id
/tiers/:tier
```

- `/dev/*` is absent from the built assets: `grep -Rho "/dev/[a-z-]*" dist/assets/*.js` returns nothing, and the manifest has no `Dev*` entry.
- `/import` does **not** exist.
- A first-time visitor with an empty database sees the gallery route with the empty state, quoted exactly:

  > **Nothing here**  
  > This archive has no everything.  
  > If you expected media, import your export on the import page.

That is an internal sentence (“no everything”) shown to a stranger, and it is the
first screen they see.

## 1e. Missing, ordered by user impact

| # | Missing | Impact | Effort |
| ---: | --- | --- | --- |
| 1 | A production import route and first-run redirect | A stranger cannot get in from the product UI; the only door is `/dev/ingest`. | **M** — one page, one route, a repository summary check. |
| 2 | Import progress, cancel and retry outside the dev harness | The import exists but a production user cannot see phase/counts or stop it. | **M** — extract the dev job view, add a worker session hook. |
| 3 | Deploy files and SPA fallback | The static build 404s on `/connections` after a refresh. | **S** — two host files and a README section. |
| 4 | Cyclone preparing state | A blank canvas before the first frame is the original “permanent loading” failure in 3D. | **S** — resident count + first-frame callback. |
| 5 | Batch download / ZIP of a selection | A user cannot take a subset of their own media. | **M** — selection state, `fflate` zip, blob download. |
| 6 | Detail next/previous | Stepping through 376 items means closing and reopening the dialog. | **S** — two buttons using the existing index/total. |
| 7 | Message fields with no surface | Share text, reactions, call duration and metadata are neither named nor raw. | **S/M** — a raw disclosure in the conversation, or named rows for the meaningful ones. |
| 8 | Cyclone text-size control | The 3D view has one type size. | **S** — one token-backed control. |
| 9 | Search outside messages | Search is the first thing missed on 3,362 following and 42,197 liked posts. | **L** — an index per category or a shared index with category scope; needs a measurement. |
| 10 | `note_and_repost_interactions` registry row | Two records remain in the unrecognised bucket. | **S** — one row, a tier and a screen decision. |
