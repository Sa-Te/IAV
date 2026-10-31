# Data map

Completion tracker for "every archive category implemented". A category is done
only when its row says parsed + rendered + tested (AGENTS.md §16).

**74 categories inventoried, 0 parsed, 0 rendered, 0 tested.**

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

Paths are proposals under `packages/core/` per AGENTS.md §2. **None of them
exist yet.** Status is `not started` everywhere: nothing has been parsed.

## T1 — settings and mechanics

| Category | Source file(s) | Schema module | Parser module | View | Status |
| --- | --- | --- | --- | --- | --- |
| `notification_preferences` | `preferences/settings/notification_preferences.json` | `packages/core/schema/notification-preferences.ts` | `packages/core/parsers/notification-preferences.ts` | none | not started |
| `comments_allowed_from` | `preferences/settings/comments_allowed_from.json` | `packages/core/schema/comments-allowed-from.ts` | `packages/core/parsers/comments-allowed-from.ts` | none | not started |
| `show_exclusive_story_promo_setting` | `preferences/settings/show_exclusive_story_promo_setting.json` | `packages/core/schema/show-exclusive-story-promo-setting.ts` | `packages/core/parsers/show-exclusive-story-promo-setting.ts` | none | not started |
| `use_cross-app_messaging` | `preferences/settings/use_cross-app_messaging.json` | `packages/core/schema/use-cross-app-messaging.ts` | `packages/core/parsers/use-cross-app-messaging.ts` | none | not started |
| `professional_information` | `personal_information/information_about_you/professional_information.json` | `packages/core/schema/professional-information.ts` | `packages/core/parsers/professional-information.ts` | none | not started |
| `note_interactions` | `personal_information/information_about_you/note_interactions.json` | `packages/core/schema/note-interactions.ts` | `packages/core/parsers/note-interactions.ts` | none | not started |
| `eligibility` | `your_instagram_activity/monetization/eligibility.json` | `packages/core/schema/eligibility.ts` | `packages/core/parsers/eligibility.ts` | table | not started |
| `bug_reports` | `your_instagram_activity/reports/bug_reports.json` | `packages/core/schema/bug-reports.ts` | `packages/core/parsers/bug-reports.ts` | list | not started |
| `instagram_profile_information` | `personal_information/information_about_you/instagram_profile_information.json` | `packages/core/schema/instagram-profile-information.ts` | `packages/core/parsers/instagram-profile-information.ts` | table | not started |
| `instagram_friend_map` | `personal_information/information_about_you/instagram_friend_map.json` | `packages/core/schema/instagram-friend-map.ts` | `packages/core/parsers/instagram-friend-map.ts` | table | not started |
| `camera_information` | `personal_information/device_information/camera_information.json` | `packages/core/schema/camera-information.ts` | `packages/core/parsers/camera-information.ts` | table | not started |
| `your_muted_story_teaser_creators` | `your_instagram_activity/subscriptions/your_muted_story_teaser_creators.json` | `packages/core/schema/muted-story-teaser-creators.ts` | `packages/core/parsers/muted-story-teaser-creators.ts` | list | not started |
| `your_link_history_settings` | `logged_information/link_history/your_link_history_settings.json` | `packages/core/schema/link-history-settings.ts` | `packages/core/parsers/link-history-settings.ts` | table | not started |
| `consents` | `preferences/settings/consents.json` | `packages/core/schema/consents.ts` | `packages/core/parsers/consents.ts` | table | not started |
| `your_activity_off_meta_technologies_settings` | `apps_and_websites_off_of_instagram/apps_and_websites/your_activity_off_meta_technologies_settings.json` | `packages/core/schema/off-meta-settings.ts` | `packages/core/parsers/off-meta-settings.ts` | table | not started |
| `your_information_download_requests` | `personal_information/information_about_you/your_information_download_requests.json` | `packages/core/schema/download-requests.ts` | `packages/core/parsers/download-requests.ts` | table | not started |
| `avatar_items` | `your_instagram_activity/avatars_store/avatar_items.json` | `packages/core/schema/avatar-items.ts` | `packages/core/parsers/avatar-items.ts` | none | not started |
| `devices` | `personal_information/device_information/devices.json` | `packages/core/schema/devices.ts` | `packages/core/parsers/devices.ts` | table | not started |

## T2 — your own behaviour and security history

| Category | Source file(s) | Schema module | Parser module | View | Status |
| --- | --- | --- | --- | --- | --- |
| `posts_you're_not_interested_in` | `your_instagram_activity/other_activity/posts_you're_not_interested_in.json` | `packages/core/schema/not-interested.ts` | `packages/core/parsers/not-interested.ts` | list | not started |
| `other_categories_used_to_reach_you` | `ads_information/ads_and_topics/other_categories_used_to_reach_you.json` | `packages/core/schema/ad-categories.ts` | `packages/core/parsers/ad-categories.ts` | list | not started |
| `profile_based_in` | `ads_information/ads_and_topics/profile_based_in.json` | `packages/core/schema/inferred-location.ts` | `packages/core/parsers/inferred-location.ts` | map | not started |
| `last_known_location` | `security_and_login_information/login_and_profile_creation/last_known_location.json` | `packages/core/schema/last-known-location.ts` | `packages/core/parsers/last-known-location.ts` | map | not started |
| `signup_details` | `security_and_login_information/login_and_profile_creation/signup_details.json` | `packages/core/schema/signup-details.ts` | `packages/core/parsers/signup-details.ts` | table | not started |
| `personal_information` | `personal_information/personal_information/personal_information.json` | `packages/core/schema/personal-information.ts` | `packages/core/parsers/personal-information.ts` | table | not started |
| `profile_searches` | `logged_information/recent_searches/profile_searches.json` | `packages/core/schema/profile-searches.ts` | `packages/core/parsers/profile-searches.ts` | list | not started |
| `word_or_phrase_searches` | `logged_information/recent_searches/word_or_phrase_searches.json` | `packages/core/schema/keyword-searches.ts` | `packages/core/parsers/keyword-searches.ts` | list | not started |
| `profile_privacy_changes` | `security_and_login_information/login_and_profile_creation/profile_privacy_changes.json` | `packages/core/schema/privacy-changes.ts` | `packages/core/parsers/privacy-changes.ts` | timeline | not started |
| `password_change_activity` | `security_and_login_information/login_and_profile_creation/password_change_activity.json` | `packages/core/schema/password-changes.ts` | `packages/core/parsers/password-changes.ts` | timeline | not started |
| `interest_categories` | `ads_information/ads_and_topics/interest_categories.json` | `packages/core/schema/interest-categories.ts` | `packages/core/parsers/interest-categories.ts` | list | not started |
| `locations_of_interest` | `ads_information/ads_and_topics/locations_of_interest.json` | `packages/core/schema/locations-of-interest.ts` | `packages/core/parsers/locations-of-interest.ts` | list | not started |
| `logout_activity` | `security_and_login_information/login_and_profile_creation/logout_activity.json` | `packages/core/schema/logout-activity.ts` | `packages/core/parsers/logout-activity.ts` | table | not started |
| `your_activity_off_meta_technologies` | `apps_and_websites_off_of_instagram/apps_and_websites/your_activity_off_meta_technologies.json` | `packages/core/schema/off-meta-activity.ts` | `packages/core/parsers/off-meta-activity.ts` | table | not started |
| `link_history` | `logged_information/link_history/link_history.json` | `packages/core/schema/link-history.ts` | `packages/core/parsers/link-history.ts` | list | not started |
| `profile_status_changes` | `security_and_login_information/login_and_profile_creation/profile_status_changes.json` | `packages/core/schema/account-status-changes.ts` | `packages/core/parsers/account-status-changes.ts` | timeline | not started |
| `profile_changes` | `personal_information/personal_information/profile_changes.json` | `packages/core/schema/profile-changes.ts` | `packages/core/parsers/profile-changes.ts` | timeline | not started |
| `recommended_topics` | `preferences/your_topics/recommended_topics.json` | `packages/core/schema/topics.ts` | `packages/core/parsers/topics.ts` | list | not started |
| `login_activity` | `security_and_login_information/login_and_profile_creation/login_activity.json` | `packages/core/schema/login-activity.ts` | `packages/core/parsers/login-activity.ts` | table | not started |
| `ads_viewed` | `ads_information/ads_and_topics/ads_viewed.json` | `packages/core/schema/ads-viewed.ts` | `packages/core/parsers/ads-viewed.ts` | list | not started |
| `posts_viewed` | `your_instagram_activity/other_activity/posts_viewed.json` | `packages/core/schema/posts-viewed.ts` | `packages/core/parsers/posts-viewed.ts` | list | not started |
| `suggested_profiles_viewed` | `your_instagram_activity/other_activity/suggested_profiles_viewed.json` | `packages/core/schema/suggested-profiles-viewed.ts` | `packages/core/parsers/suggested-profiles-viewed.ts` | list | not started |
| `videos_watched` | `your_instagram_activity/other_activity/videos_watched.json` | `packages/core/schema/videos-watched.ts` | `packages/core/parsers/videos-watched.ts` | list | not started |
| `advertisers_using_your_activity_or_information` | `ads_information/instagram_ads_and_businesses/advertisers_using_your_activity_or_information.json` | `packages/core/schema/advertisers.ts` | `packages/core/parsers/advertisers.ts` | table | not started |

## T3 — your own media and content

| Category | Source file(s) | Schema module | Parser module | View | Status |
| --- | --- | --- | --- | --- | --- |
| `profile_photos` | `your_instagram_activity/media/profile_photos.json` | `packages/core/schema/profile-photos.ts` | `packages/core/parsers/profile-photos.ts` | gallery | not started |
| `story_reaction_sticker_reactions` | `your_instagram_activity/story_interactions/story_reaction_sticker_reactions.json` | `packages/core/schema/story-reactions.ts` | `packages/core/parsers/story-reactions.ts` | list | not started |
| `reels_comments` | `your_instagram_activity/comments/reels_comments.json` | `packages/core/schema/reels-comments.ts` | `packages/core/parsers/reels-comments.ts` | list | not started |
| `questions` | `your_instagram_activity/story_interactions/questions.json` | `packages/core/schema/story-questions.ts` | `packages/core/parsers/story-questions.ts` | list | not started |
| `emoji_sliders` | `your_instagram_activity/story_interactions/emoji_sliders.json` | `packages/core/schema/emoji-sliders.ts` | `packages/core/parsers/emoji-sliders.ts` | list | not started |
| `archived_posts` | `your_instagram_activity/media/archived_posts.json` | `packages/core/schema/archived-posts.ts` | `packages/core/parsers/archived-posts.ts` | gallery | not started |
| `quizzes` | `your_instagram_activity/story_interactions/quizzes.json` | `packages/core/schema/story-quizzes.ts` | `packages/core/parsers/story-quizzes.ts` | list | not started |
| `posts` | `your_instagram_activity/media/posts_1.json` | `packages/core/schema/posts.ts` | `packages/core/parsers/posts.ts` | gallery | not started |
| `story_likes` | `your_instagram_activity/likes/story_likes.json` | `packages/core/schema/story-likes.ts` | `packages/core/parsers/story-likes.ts` | list | not started |
| `liked_comments` | `your_instagram_activity/likes/liked_comments.json` | `packages/core/schema/liked-comments.ts` | `packages/core/parsers/liked-comments.ts` | list | not started |
| `stories` | `your_instagram_activity/media/stories.json` | `packages/core/schema/stories.ts` | `packages/core/parsers/stories.ts` | gallery | not started |
| `saved_collections` | `your_instagram_activity/saved/saved_collections.json` | `packages/core/schema/saved-collections.ts` | `packages/core/parsers/saved-collections.ts` | list | not started |
| `post_comments` | `your_instagram_activity/comments/post_comments_1.json` | `packages/core/schema/post-comments.ts` | `packages/core/parsers/post-comments.ts` | list | not started |
| `polls` | `your_instagram_activity/story_interactions/polls.json` | `packages/core/schema/story-polls.ts` | `packages/core/parsers/story-polls.ts` | list | not started |
| `saved_posts` | `your_instagram_activity/saved/saved_posts.json` | `packages/core/schema/saved-posts.ts` | `packages/core/parsers/saved-posts.ts` | list | not started |
| `liked_posts` | `your_instagram_activity/likes/liked_posts.json` | `packages/core/schema/liked-posts.ts` | `packages/core/parsers/liked-posts.ts` | list | not started |

## T4 — third-party identities

| Category | Source file(s) | Schema module | Parser module | View | Status |
| --- | --- | --- | --- | --- | --- |
| `secret_conversations` | `your_instagram_activity/messages/secret_conversations.json` | `packages/core/schema/secret-conversations.ts` | `packages/core/parsers/secret-conversations.ts` | table | not started |
| `removed_suggestions` | `connections/followers_and_following/removed_suggestions.json` | `packages/core/schema/removed-suggestions.ts` | `packages/core/parsers/removed-suggestions.ts` | list | not started |
| `restricted_profiles` | `connections/followers_and_following/restricted_profiles.json` | `packages/core/schema/restricted-profiles.ts` | `packages/core/parsers/restricted-profiles.ts` | list | not started |
| `hide_story_from` | `connections/followers_and_following/hide_story_from.json` | `packages/core/schema/hide-story-from.ts` | `packages/core/parsers/hide-story-from.ts` | list | not started |
| `close_friends` | `connections/followers_and_following/close_friends.json` | `packages/core/schema/close-friends.ts` | `packages/core/parsers/close-friends.ts` | list | not started |
| `recent_follow_requests` | `connections/followers_and_following/recent_follow_requests.json` | `packages/core/schema/follow-requests.ts` | `packages/core/parsers/follow-requests.ts` | list | not started |
| `follow_requests_you've_received` | `connections/followers_and_following/follow_requests_you've_received.json` | `packages/core/schema/follow-requests-received.ts` | `packages/core/parsers/follow-requests-received.ts` | list | not started |
| `recently_unfollowed_profiles` | `connections/followers_and_following/recently_unfollowed_profiles.json` | `packages/core/schema/unfollowed-profiles.ts` | `packages/core/parsers/unfollowed-profiles.ts` | list | not started |
| `blocked_profiles` | `connections/followers_and_following/blocked_profiles.json` | `packages/core/schema/blocked-profiles.ts` | `packages/core/parsers/blocked-profiles.ts` | list | not started |
| `following_hashtags` | `connections/followers_and_following/following_hashtags.json` | `packages/core/schema/following-hashtags.ts` | `packages/core/parsers/following-hashtags.ts` | list | not started |
| `pending_follow_requests` | `connections/followers_and_following/pending_follow_requests.json` | `packages/core/schema/follow-requests-sent.ts` | `packages/core/parsers/follow-requests-sent.ts` | list | not started |
| `followers` | `connections/followers_and_following/followers_1.json` | `packages/core/schema/followers.ts` | `packages/core/parsers/followers.ts` | list | not started |
| `synced_contacts` | `connections/contacts/synced_contacts.json` | `packages/core/schema/synced-contacts.ts` | `packages/core/parsers/synced-contacts.ts` | list | not started |
| `following` | `connections/followers_and_following/following.json` | `packages/core/schema/following.ts` | `packages/core/parsers/following.ts` | list | not started |

## T5 — third-party authored text

| Category | Source file(s) | Schema module | Parser module | View | Status |
| --- | --- | --- | --- | --- | --- |
| `messages_requests` | `your_instagram_activity/messages/message_requests/**/message_1.json` | `packages/core/schema/messages.ts` | `packages/core/parsers/messages.ts` | messages | not started |
| `messages_inbox` | `your_instagram_activity/messages/inbox/**/message_1.json` | `packages/core/schema/messages.ts` | `packages/core/parsers/messages.ts` | messages | not started |

## Status values

`not started` · `schema` · `parsed` · `rendered` · `tested`

A row is only marked `parsed` once its parser has a fixture, a malformed-input
test and an empty-file test (AGENTS.md §9).
