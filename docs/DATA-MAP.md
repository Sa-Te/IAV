# Data map

Completion tracker for "every archive category implemented". A category is done
only when its row says parsed + rendered + tested (AGENTS.md §16).

**87 categories inventoried, 72 present, 15 not in the current baseline, 3 with
the full per-category fixture set** (`stories`, `archived_posts`, `posts`). Plus
one unrecognised bucket (ADR 0002, tier 3) that is always present by design.

Of the 72 present in `archive-2/`, **12 T1, 24 T2 and all 18 T3 categories now
have a bespoke screen** — ten T1 settings pages, one avatar grid, one device
profile; sixteen T2 event lists, four T2 settings pages, one profile with a local
photo, three T2 name/place lists (M20/M21); fourteen T3 event lists (three of them
gated) — **3 media categories have their own gallery routes**, two more render
their media inside another screen (T2's profile photo, T3's `profile_photos` as a
raw tree whose photo is reachable through Everything), and **2 message categories
render as a thread list** behind the reveal gate. The rest render through the
generic table, or the raw tree when the shape carries no labels. The fifteen
absent rows stay registered: absence is a normal state (ADR 0002), and an
ordinary export must not look broken.

`reels` is registered by name only: no reels file exists in this baseline, so it has
no measured shape (ADR 0008 permits an empty signature list) and no observed media
layout. The sidebar shows it as a muted row rather than hiding it, and a real
`reels.json` resolves to it instead of falling into the unrecognised bucket.

Rows are ordered by privacy weight **ascending**, so the categories that carry
other people's identities and words (connections, messages) sit at the bottom
and get built deliberately rather than as a side effect.

| Tier | Meaning |
| --- | --- |
| T1 | Settings, booleans, device and account mechanics. No prose, no third party. |
| T2 | Your own behavioural and security history. |
| T3 | Your own media and content. |
| T4 | Third-party identities: who follows you, who you follow, synced contacts. |
| T5 | Third-party authored text: messages written by other people. |

**Variant risk** is how likely another export breaks this category's
resolution, per `docs/ARCHIVE-VARIANTS.md`.

| Risk | Criterion |
| --- | --- |
| `high` | The resolver depends on parent-folder context, **or** M2 flagged the category's *shape* with an open question (structure, identity or missing link), **or** its filename carries a known hazard (apostrophe). |
| `medium` | The shape is known, but the file sits in a near-duplicate name cluster, is a near-twin of another file, or has an open question about a *value vocabulary* only. |
| `low` | A single stable filename with a distinct shape, no open questions. |

Paths are real module paths under `packages/core/src/` per AGENTS.md §2. A path is
a plan until its Status says otherwise; the rows below say what each category
actually has, and the View column says which screen renders it.

## T1 — settings and mechanics

| Category | Source file(s) | Schema module | Parser module | View | Variant risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `notification_preferences` | `preferences/settings/notification_preferences.json` | `packages/core/schema/notification-preferences.ts` | `packages/core/parsers/notification-preferences.ts` | settings | low | parsed + rendered |
| `comments_allowed_from` | `preferences/settings/comments_allowed_from.json` | `packages/core/schema/comments-allowed-from.ts` | `packages/core/parsers/comments-allowed-from.ts` | none | low | not started — not present in the current baseline |
| `show_exclusive_story_promo_setting` | `preferences/settings/show_exclusive_story_promo_setting.json` | `packages/core/schema/show-exclusive-story-promo-setting.ts` | `packages/core/parsers/show-exclusive-story-promo-setting.ts` | none | low | not started — not present in the current baseline |
| `use_cross-app_messaging` | `preferences/settings/use_cross-app_messaging.json` | `packages/core/schema/use-cross-app-messaging.ts` | `packages/core/parsers/use-cross-app-messaging.ts` | none | medium | not started — not present in the current baseline |
| `professional_information` | `personal_information/information_about_you/professional_information.json` | `packages/core/schema/professional-information.ts` | `packages/core/parsers/professional-information.ts` | none | low | not started — not present in the current baseline |
| `note_interactions` | `personal_information/information_about_you/note_interactions.json` | `packages/core/schema/note-interactions.ts` | `packages/core/parsers/note-interactions.ts` | none | low | not started — not present in the current baseline |
| `eligibility` | `your_instagram_activity/monetization/eligibility.json` | `packages/core/schema/eligibility.ts` | `packages/core/parsers/eligibility.ts` | settings | low | parsed + rendered |
| `bug_reports` | `your_instagram_activity/reports/bug_reports.json` | `packages/core/schema/bug-reports.ts` | `packages/core/parsers/bug-reports.ts` | settings | low | parsed + rendered |
| `instagram_profile_information` | `personal_information/information_about_you/instagram_profile_information.json` | `packages/core/schema/instagram-profile-information.ts` | `packages/core/parsers/instagram-profile-information.ts` | settings | low | parsed + rendered |
| `instagram_friend_map` | `personal_information/information_about_you/instagram_friend_map.json` | `packages/core/schema/instagram-friend-map.ts` | `packages/core/parsers/instagram-friend-map.ts` | settings | low | parsed + rendered |
| `camera_information` | `personal_information/device_information/camera_information.json` | `packages/core/schema/camera-information.ts` | `packages/core/parsers/camera-information.ts` | table | low | not started — not present in the current baseline |
| `your_muted_story_teaser_creators` | `your_instagram_activity/subscriptions/your_muted_story_teaser_creators.json` | `packages/core/schema/muted-story-teaser-creators.ts` | `packages/core/parsers/muted-story-teaser-creators.ts` | list | medium | not started — not present in the current baseline |
| `your_link_history_settings` | `logged_information/link_history/your_link_history_settings.json` | `packages/core/schema/link-history-settings.ts` | `packages/core/parsers/link-history-settings.ts` | settings | medium | parsed + rendered |
| `consents` | `preferences/settings/consents.json` | `packages/core/schema/consents.ts` | `packages/core/parsers/consents.ts` | settings | low | parsed + rendered |
| `your_activity_off_meta_technologies_settings` | `apps_and_websites_off_of_instagram/apps_and_websites/your_activity_off_meta_technologies_settings.json` | `packages/core/schema/off-meta-settings.ts` | `packages/core/parsers/off-meta-settings.ts` | settings | medium | parsed + rendered |
| `your_information_download_requests` | `personal_information/information_about_you/your_information_download_requests.json` | `packages/core/schema/download-requests.ts` | `packages/core/parsers/download-requests.ts` | settings | low | parsed + rendered |
| `avatar_items` | `your_instagram_activity/avatars_store/avatar_items.json` | `packages/core/schema/avatar-items.ts` | `packages/core/parsers/avatar-items.ts` | avatar grid | high | parsed + rendered |
| `devices` | `personal_information/device_information/devices.json` | `packages/core/schema/devices.ts` | `packages/core/parsers/devices.ts` | table | low | not started — not present in the current baseline |
| `ad_preferences` | `ads_information/instagram_ads_and_businesses/ad_preferences.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | settings | medium | parsed + rendered |
| `device_camera_effects_support` | `personal_information/device_information/device_camera_effects_support.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | device profile | medium | parsed + rendered |

## T2 — your own behaviour and security history

| Category | Source file(s) | Schema module | Parser module | View | Variant risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `posts_you're_not_interested_in` | `your_instagram_activity/other_activity/posts_you're_not_interested_in.json` | `packages/core/schema/not-interested.ts` | `packages/core/parsers/not-interested.ts` | event list | high | parsed + rendered |
| `other_categories_used_to_reach_you` | `ads_information/instagram_ads_and_businesses/other_categories_used_to_reach_you.json` | `packages/core/schema/ad-categories.ts` | `packages/core/parsers/ad-categories.ts` | name list | medium | parsed + rendered |
| `profile_based_in` | `personal_information/information_about_you/profile_based_in.json` | `packages/core/schema/inferred-location.ts` | `packages/core/parsers/inferred-location.ts` | settings | low | parsed + rendered |
| `last_known_location` | `security_and_login_information/login_and_profile_creation/last_known_location.json` | `packages/core/schema/last-known-location.ts` | `packages/core/parsers/last-known-location.ts` | settings | medium | parsed + rendered |
| `signup_details` | `security_and_login_information/login_and_profile_creation/signup_details.json` | `packages/core/schema/signup-details.ts` | `packages/core/parsers/signup-details.ts` | settings | low | parsed + rendered |
| `personal_information` | `personal_information/personal_information/personal_information.json` | `packages/core/schema/personal-information.ts` | `packages/core/parsers/personal-information.ts` | profile + photo | medium | parsed + rendered |
| `profile_searches` | `logged_information/recent_searches/profile_searches.json` | `packages/core/schema/profile-searches.ts` | `packages/core/parsers/profile-searches.ts` | event list | medium | parsed + rendered |
| `word_or_phrase_searches` | `logged_information/recent_searches/word_or_phrase_searches.json` | `packages/core/schema/keyword-searches.ts` | `packages/core/parsers/keyword-searches.ts` | event list | medium | parsed + rendered |
| `profile_privacy_changes` | `security_and_login_information/login_and_profile_creation/profile_privacy_changes.json` | `packages/core/schema/privacy-changes.ts` | `packages/core/parsers/privacy-changes.ts` | event list | low | parsed + rendered |
| `password_change_activity` | `security_and_login_information/login_and_profile_creation/password_change_activity.json` | `packages/core/schema/password-changes.ts` | `packages/core/parsers/password-changes.ts` | timeline | low | not started — not present in the current baseline |
| `interest_categories` | `ads_information/ads_and_topics/interest_categories.json` | `packages/core/schema/interest-categories.ts` | `packages/core/parsers/interest-categories.ts` | list | low | not started — not present in the current baseline |
| `locations_of_interest` | `personal_information/information_about_you/locations_of_interest.json` | `packages/core/schema/locations-of-interest.ts` | `packages/core/parsers/locations-of-interest.ts` | name list | high | parsed + rendered |
| `logout_activity` | `security_and_login_information/login_and_profile_creation/logout_activity.json` | `packages/core/schema/logout-activity.ts` | `packages/core/parsers/logout-activity.ts` | event list | low | parsed + rendered |
| `your_activity_off_meta_technologies` | `apps_and_websites_off_of_instagram/apps_and_websites/your_activity_off_meta_technologies.json` | `packages/core/schema/off-meta-activity.ts` | `packages/core/parsers/off-meta-activity.ts` | table | high | not started — not present in the current baseline |
| `link_history` | `logged_information/link_history/link_history.json` | `packages/core/schema/link-history.ts` | `packages/core/parsers/link-history.ts` | event list | high | parsed + rendered |
| `profile_status_changes` | `security_and_login_information/login_and_profile_creation/profile_status_changes.json` | `packages/core/schema/account-status-changes.ts` | `packages/core/parsers/account-status-changes.ts` | event list | medium | parsed + rendered |
| `profile_changes` | `personal_information/personal_information/profile_changes.json` | `packages/core/schema/profile-changes.ts` | `packages/core/parsers/profile-changes.ts` | event list | medium | parsed + rendered |
| `recommended_topics` | `preferences/your_topics/recommended_topics.json` | `packages/core/schema/topics.ts` | `packages/core/parsers/topics.ts` | list | low | not started — not present in the current baseline |
| `login_activity` | `security_and_login_information/login_and_profile_creation/login_activity.json` | `packages/core/schema/login-activity.ts` | `packages/core/parsers/login-activity.ts` | event list | low | parsed + rendered |
| `ads_viewed` | `ads_information/ads_and_topics/ads_viewed.json` | `packages/core/schema/ads-viewed.ts` | `packages/core/parsers/ads-viewed.ts` | list | low | not started — not present in the current baseline |
| `posts_viewed` | `your_instagram_activity/other_activity/posts_viewed.json` | `packages/core/schema/posts-viewed.ts` | `packages/core/parsers/posts-viewed.ts` | event list | low | parsed + rendered |
| `suggested_profiles_viewed` | `your_instagram_activity/other_activity/suggested_profiles_viewed.json` | `packages/core/schema/suggested-profiles-viewed.ts` | `packages/core/parsers/suggested-profiles-viewed.ts` | event list | low | parsed + rendered |
| `videos_watched` | `your_instagram_activity/other_activity/videos_watched.json` | `packages/core/schema/videos-watched.ts` | `packages/core/parsers/videos-watched.ts` | event list | low | parsed + rendered |
| `advertisers_using_your_activity_or_information` | `ads_information/instagram_ads_and_businesses/advertisers_using_your_activity_or_information.json` | `packages/core/schema/advertisers.ts` | `packages/core/parsers/advertisers.ts` | name list | low | parsed + rendered |
| `posts_you're_interested_or_not_interested_in` | `ads_information/ads_and_topics/posts_you're_interested_or_not_interested_in.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | high | parsed + rendered |
| `subscription_for_no_ads` | `ads_information/instagram_ads_and_businesses/subscription_for_no_ads.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | settings | medium | parsed + rendered |
| `profile_activity` | `security_and_login_information/login_and_profile_creation/profile_activity.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | medium | parsed + rendered |
| `stories_viewed` | `your_instagram_activity/story_interactions/stories_viewed.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | medium | parsed + rendered |
| `your_ownership_of_digital_items` | `your_instagram_activity/other_activity/your_ownership_of_digital_items.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | medium | parsed + rendered |

## T3 — your own media and content

Measured in M22 (`docs/T3-DESIGN.md`). Fourteen categories are dated label/value
lists and render through the event list; four are media and keep their gallery
routes. Three of the lists contain other people's words and carry `gated: true`
in the registry — they stay on this tier page and ask before they render
(ADR 0014). `posts` is the only T3 category with a dedicated schema and parser:
the other rows are read by the shared label/value reader, and the column says so.

| Category | Source file(s) | Schema module | Parser module | View | Variant risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `profile_photos` | `your_instagram_activity/media/profile_photos.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | tree (the photo is in Everything) | low | parsed + raw view |
| `story_reaction_sticker_reactions` | `your_instagram_activity/story_interactions/story_reaction_sticker_reactions.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | high | parsed + rendered + tested |
| `reels_comments` | `your_instagram_activity/comments/reels_comments.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | medium | parsed + rendered + tested |
| `questions` | `your_instagram_activity/story_interactions/questions.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | high | parsed + rendered + tested |
| `emoji_sliders` | `your_instagram_activity/story_interactions/emoji_sliders.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | high | parsed + rendered + tested |
| `archived_posts` | `your_instagram_activity/media/archived_posts.json` | `packages/core/schema/archivedPosts.ts` | `packages/core/parsers/archivedPosts.ts` | gallery | low | parsed + rendered + tested |
| `quizzes` | `your_instagram_activity/story_interactions/quizzes.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | high | parsed + rendered + tested |
| `posts` | `your_instagram_activity/media/posts.json`, `.../posts_1.json` | `packages/core/src/schema/posts.ts` | `packages/core/src/parsers/posts.ts` | gallery | medium | parsed + rendered + tested |
| `reels` | `your_instagram_activity/media/reels.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | none | medium | registered, unmeasured — absent from the current baseline |
| `story_likes` | `your_instagram_activity/likes/story_likes.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | medium | parsed + rendered + tested |
| `liked_comments` | `your_instagram_activity/likes/liked_comments.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | low | parsed + rendered + tested |
| `stories` | `your_instagram_activity/media/stories.json` | `packages/core/schema/stories.ts` | `packages/core/parsers/stories.ts` | gallery | high | parsed + rendered + tested |
| `saved_collections` | `your_instagram_activity/saved/saved_collections.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | high | parsed + rendered + tested |
| `post_comments` | `your_instagram_activity/comments/post_comments_1.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | high | parsed + rendered + tested |
| `polls` | `your_instagram_activity/story_interactions/polls.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | high | parsed + rendered + tested |
| `saved_posts` | `your_instagram_activity/saved/saved_posts.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | high | parsed + rendered + tested |
| `liked_posts` | `your_instagram_activity/likes/liked_posts.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | medium | parsed + rendered + tested |
| `instants_interactions` | `your_instagram_activity/instants/instants_interactions.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | medium | parsed + rendered + tested |
| `other_content` | `your_instagram_activity/media/other_content.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | event list | medium | parsed + rendered + tested |

## T4 — third-party identities

| Category | Source file(s) | Schema module | Parser module | View | Variant risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `secret_conversations` | `your_instagram_activity/messages/secret_conversations.json` | `packages/core/schema/secret-conversations.ts` | `packages/core/parsers/secret-conversations.ts` | table | high | not started — not present in the current baseline |
| `removed_suggestions` | `connections/followers_and_following/removed_suggestions.json` | `packages/core/schema/removed-suggestions.ts` | `packages/core/parsers/removed-suggestions.ts` | list | low | parsed + rendered |
| `restricted_profiles` | `connections/followers_and_following/restricted_profiles.json` | `packages/core/schema/restricted-profiles.ts` | `packages/core/parsers/restricted-profiles.ts` | list | low | parsed + rendered |
| `hide_story_from` | `connections/followers_and_following/hide_story_from.json` | `packages/core/schema/hide-story-from.ts` | `packages/core/parsers/hide-story-from.ts` | list | low | parsed + rendered |
| `close_friends` | `connections/followers_and_following/close_friends.json` | `packages/core/schema/close-friends.ts` | `packages/core/parsers/close-friends.ts` | list | low | parsed + rendered |
| `recent_follow_requests` | `connections/followers_and_following/recent_follow_requests.json` | `packages/core/schema/follow-requests.ts` | `packages/core/parsers/follow-requests.ts` | list | medium | parsed + rendered |
| `follow_requests_you've_received` | `connections/followers_and_following/follow_requests_you've_received.json` | `packages/core/schema/follow-requests-received.ts` | `packages/core/parsers/follow-requests-received.ts` | list | high | parsed + raw view |
| `recently_unfollowed_profiles` | `connections/followers_and_following/recently_unfollowed_profiles.json` | `packages/core/schema/unfollowed-profiles.ts` | `packages/core/parsers/unfollowed-profiles.ts` | list | low | parsed + rendered |
| `blocked_profiles` | `connections/followers_and_following/blocked_profiles.json` | `packages/core/schema/blocked-profiles.ts` | `packages/core/parsers/blocked-profiles.ts` | list | low | parsed + rendered |
| `following_hashtags` | `connections/followers_and_following/following_hashtags.json` | `packages/core/schema/following-hashtags.ts` | `packages/core/parsers/following-hashtags.ts` | list | low | parsed + raw view |
| `pending_follow_requests` | `connections/followers_and_following/pending_follow_requests.json` | `packages/core/schema/follow-requests-sent.ts` | `packages/core/parsers/follow-requests-sent.ts` | list | medium | parsed + rendered |
| `followers` | `connections/followers_and_following/followers_1.json` | `packages/core/schema/followers.ts` | `packages/core/parsers/followers.ts` | list | medium | parsed + raw view |
| `synced_contacts` | `connections/contacts/synced_contacts.json` | `packages/core/schema/synced-contacts.ts` | `packages/core/parsers/synced-contacts.ts` | list | low | parsed + rendered |
| `following` | `connections/followers_and_following/following.json` | `packages/core/schema/following.ts` | `packages/core/parsers/following.ts` | list | low | parsed + raw view |

## T5 — third-party authored text

| Category | Source file(s) | Schema module | Parser module | View | Variant risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `messages_requests` | `your_instagram_activity/messages/message_requests/**/message_1.json` | `packages/core/schema/messages.ts` | `packages/core/parsers/messages.ts` | thread list | high | parsed + rendered (M9: thread list behind the T5 gate) |
| `messages_inbox` | `your_instagram_activity/messages/inbox/**/message_1.json` | `packages/core/schema/messages.ts` | `packages/core/parsers/messages.ts` | thread list | high | parsed + rendered (M9: thread list behind the T5 gate) |
| `ai_conversations` | `your_instagram_activity/messages/ai_conversations.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | none | medium | parsed + rendered |
| `checkout_payment_information` | `your_instagram_activity/shopping/checkout_payment_information.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | none | medium | parsed + rendered |
| `threads_viewed` | `your_instagram_activity/threads/threads_viewed.json` | `packages/core/src/schema/opaque.ts` | `packages/core/src/parsers/opaque.ts` | none | medium | parsed + rendered |

## Unrecognised bucket — not a category

ADR 0002 tier 3. Always present, never absent, never empty-by-design. Anything
no rule matches is parsed generically and surfaced here.

| Category | Source file(s) | Schema module | Parser module | View | Variant risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `(unrecognised bucket)` | any JSON file matching no name rule and no structural signature | `packages/core/schema/unrecognised.ts` | `packages/core/parsers/unrecognised.ts` | table | high | not started |

## Status values

`not started` · `schema` · `parsed` · `parsed + rendered` · `parsed + raw view` ·
`parsed + rendered + tested` · `registered, unmeasured — absent from the current baseline` ·
`not present in the current baseline`

A row is only marked `parsed` once its parser has a fixture, a malformed-input
test and an empty-file test (AGENTS.md §9). `parsed + rendered` means the category
has a view at `/categories/:id`, bespoke or generic; the View column says which
(`settings`, `event list`, `profile + photo`, `name list`, `gallery`, `table`,
`tree`, `timeline`, `map`, `thread list`). `parsed + raw view` is the generic
view falling back to a JSON tree because the shape has no labels. The generic
table and tree remain the fallback for every category without a bespoke screen.
