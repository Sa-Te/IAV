# T2 — what the twenty-four present categories actually contain

Measured from `archive-2/` on 2026-11-13 (baseline `fmt-e57990`), before any T2
screen was designed. This document is the evidence for the grouping, the role
mapping and the screen assignment. It contains key names, label strings, types,
counts and shapes only: no personal value is reproduced.

The probe ran the same ingest path the app runs, then read every T2 category's
representative entry, every label item inside `label_values` or
`string_map_data`, the value kind, the timestamp key, and whether any entry
carries media or a URL.

## 1. The twenty-four present rows

`Labels` are the exact display strings the export uses, in the order measured.
`Timestamp` is the key that actually carries the date; `string_map_data.X.timestamp`
means the label object has an empty `value` and a numeric `timestamp` beside it —
that distinction matters, because a reader that only looks at `value` sees an
empty string.

| Category | Display name | Entries | Representative keys | Labels (verbatim) | Timestamp | URL | Media |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `advertisers_using_your_activity_or_information` | Advertisers using your data | 1 | `fbid`, `label_values`, `media` | 3 advertiser-list labels, each `vec` (2,495 + 0 + 0 names) | none | no | no |
| `last_known_location` | Last known location | 1 | `media_map_data`, `string_map_data`, `title` | `Imprecise latitude`, `Imprecise longitude`, `Precise latitude`, `Precise longitude`, `GPS time uploaded` | `GPS time uploaded.timestamp` | no | no |
| `link_history` | Link history | 1 | `fbid`, `label_values`, `media`, `timestamp` | `Website link that you visited`, `Title of website page that you visited`, `Website session start time`, `Website session end time` | entry `timestamp` | `Website link that you visited` | no |
| `locations_of_interest` | Locations of interest | 1 | `fbid`, `label_values`, `media` | `Locations of interest` (`vec`, 5 place names), `Usage explanation` | none | no | no |
| `login_activity` | Logins | 103 | `media_map_data`, `string_map_data`, `title` | `Cookie Name`, `IP Address`, `Port`, `Language Code`, `Time`, `User Agent` | `Time.timestamp` (value empty) | no | no |
| `logout_activity` | Logouts | 15 | `media_map_data`, `string_map_data`, `title` | `Cookie Name`, `IP Address`, `Port`, `Language Code`, `Time`, `User Agent` | `Time.timestamp` (value empty) | no | no |
| `other_categories_used_to_reach_you` | Ad categories used to reach you | 1 | `fbid`, `label_values`, `media` | `Name` (`vec`, 4 names) | none | no | no |
| `personal_information` | Personal information | 1 | `media_map_data`, `string_map_data`, `title` | `Username`, `Name`, `Bio`, `Gender`, `Date of birth`, `Private Account`, `Emoji Pong High Score` | none | no | **1 profile photo**, root-relative, present in the ZIP |
| `posts_viewed` | Posts viewed | 243 | `fbid`, `label_values`, `media`, `timestamp` | `Ad library public URL`, `Brand partner`, `Brand partner's profile`, `URL`, `Caption`, `Title` | entry `timestamp` | `URL` (`href`) | no |
| `posts_you're_interested_or_not_interested_in` | Posts you are interested or not interested in | 2 | `fbid`, `label_values`, `media`, `timestamp` | `Feedback`, `Surface`, `Source` | entry `timestamp` | no | no |
| `posts_you're_not_interested_in` | Posts you are not interested in | 11 | `fbid`, `label_values`, `media`, `timestamp` | `Source`, `Surface` | entry `timestamp` | no | no |
| `profile_activity` | Profile activity | 532 | `fbid`, `label_values`, `media`, `timestamp` | `Last login`, `Type`, `IP address`, `Port number`, `App`, `App version`, `User agent`, `Language`, `Cookie`, `Device ID`, `Details` | entry `timestamp` and `Last login.timestamp` | no | no |
| `profile_based_in` | Inferred location | 1 | `fbid`, `label_values`, `media` | `Location` (`dict`: `Country`, `Region`, `City`) | none | no | no |
| `profile_changes` | Profile changes | 43 | `media_map_data`, `string_map_data`, `title` | `Changed`, `Previous value`, `New value`, `Change date` | `Change date.timestamp` (value empty) | no | no |
| `profile_privacy_changes` | Privacy changes | 3 | `string_list_data`, `title` | none — `title` + `string_list_data` | `string_list_data[0].timestamp` | no | no |
| `profile_searches` | Profile searches | 2 | `string_list_data`, `title` | none — `title` + `string_list_data` | `string_list_data[0].timestamp` | `string_list_data[0].href` | no |
| `profile_status_changes` | Account status changes | 54 | `string_map_data` | `Time`, `Activation Type` | `Time.timestamp` | no | no |
| `signup_details` | Signup details | 1 | `media_map_data`, `string_map_data`, `title` | `Username`, `IP Address`, `Time`, `Email`, `Phone Number`, `Device` | `Time.timestamp` (value empty) | no | no |
| `stories_viewed` | Stories viewed | 7,849 | `fbid`, `label_values`, `media`, `timestamp` | `URL`, `Caption`, `Title` | entry `timestamp` | `URL` (`href`); some `Caption` values are URLs | no |
| `subscription_for_no_ads` | Subscription for no ads | 1 | `fbid`, `label_values`, `media`, `timestamp` | `Your subscription status`, `Last updated time` | entry `timestamp` and `Last updated time.timestamp` | no | no |
| `suggested_profiles_viewed` | Suggested profiles viewed | 1,784 | `fbid`, `label_values`, `media`, `timestamp` | `URL`, `Name`, `Username` | entry `timestamp` | `URL` (profile URL) | no |
| `videos_watched` | Videos watched | 711 | `fbid`, `label_values`, `media`, `timestamp` | `Ad library public URL`, `Brand partner`, `Brand partner's profile`, `URL`, `Caption`, `Title` | entry `timestamp` | `URL` (`href`) | no |
| `word_or_phrase_searches` | Keyword searches | 2 | `string_map_data` | `Search`, `Time` | `Time.timestamp` | no | no |
| `your_ownership_of_digital_items` | Your ownership of digital items | 6 | `fbid`, `label_values`, `media`, `timestamp` | `Quantity`, `Status`, `Update time`, `Active`, `Expiry time`, `Grant time`, `Creation time`, `Validation status`, `Revoked`, `Item`, `Type`, `Last updated time`, `Product type` | entry `timestamp` and five label timestamps | no | no |

### The timestamp-in-string-map finding

Four categories (`login_activity`, `logout_activity`, `profile_changes`,
`signup_details`) put the date in a label object shaped
`{href: "", value: "", timestamp: 1786001771}`. The existing envelope reader
preferred `value` whenever the key existed, so it saw an empty string and the
timestamp disappeared. The event-list reader must prefer the timestamp when the
value is empty; the settings screen gets the same correction for
`signup_details.Time`.

## 2. What each category actually is

| Group | Categories | Count | What it needs |
| --- | --- | ---: | --- |
| Event/activity lists with a date | `link_history`, `login_activity`, `logout_activity`, `posts_viewed`, `posts_you're_interested_or_not_interested_in`, `posts_you're_not_interested_in`, `profile_activity`, `profile_changes`, `profile_privacy_changes`, `profile_searches`, `profile_status_changes`, `stories_viewed`, `suggested_profiles_viewed`, `videos_watched`, `word_or_phrase_searches`, `your_ownership_of_digital_items` | 16 | one event-list screen |
| Settings-shaped | `signup_details`, `subscription_for_no_ads` | 2 | the existing T1 settings screen |
| Location details | `last_known_location`, `profile_based_in` | 2 | a field list; no map (see §5) |
| Name/place lists | `advertisers_using_your_activity_or_information`, `other_categories_used_to_reach_you`, `locations_of_interest` | 3 | a paginated name list, not the event list |
| Profile with media | `personal_information` | 1 | the existing media layer plus fields |

The expected "~19 event/activity lists" is right if the three name/place lists
are counted with them. The measured split is 16 dated event lists + 3 name/place
lists = 19 list-shaped categories.

## 3. The role mapping (derived, not invented)

The hero is chosen by a label-name priority measured across the 16 event
categories: `Caption` > `Title` > `Name` > `Search` > `Changed` >
`Activation Type`. The first label in that order with a non-empty text value is
the hero. A category with none of those labels gets the plain field list; no hero
is invented. The date is the entry `timestamp`, then a label timestamp, then
`string_list_data[0].timestamp`.

| Category | Hero label | Confidence | Why | Date source |
| --- | --- | --- | --- | --- |
| `link_history` | `Title of website page that you visited` | high | it is the page title; the URL is the link | entry `timestamp` |
| `login_activity` | none | high | no caption-like label; the row is the field list | `Time.timestamp` |
| `logout_activity` | none | high | same shape as logins | `Time.timestamp` |
| `posts_viewed` | `Caption` | high | 243 entries carry a non-empty caption; `Title` is empty | entry `timestamp` |
| `posts_you're_interested_or_not_interested_in` | none | high | `Feedback`/`Surface`/`Source` are labels, not captions | entry `timestamp` |
| `posts_you're_not_interested_in` | none | high | `Source`/`Surface` only | entry `timestamp` |
| `profile_activity` | none | medium | `Type` is an event type, not a caption; using it would be an interpretation | entry `timestamp` (fallback `Last login`) |
| `profile_changes` | `Changed` | medium | it names what changed; the value is the change | `Change date.timestamp` |
| `profile_privacy_changes` | `title` (no label layer) | high | the entry has only `title` and a timestamp | `string_list_data[0].timestamp` |
| `profile_searches` | `title` (no label layer) | high | the entry has only `title`, `href`, timestamp | `string_list_data[0].timestamp` |
| `profile_status_changes` | `Activation Type` | medium | the event type is the meaningful summary | `Time.timestamp` |
| `stories_viewed` | `Caption` | high | 7,849 entries; `Title` is empty | entry `timestamp` |
| `suggested_profiles_viewed` | `Name` | high | the profile name is the subject; `Username` is secondary | entry `timestamp` |
| `videos_watched` | `Caption` | high | 711 entries; `Title` is empty | entry `timestamp` |
| `word_or_phrase_searches` | `Search` | high | the query is the row | `Time.timestamp` |
| `your_ownership_of_digital_items` | none | high | `Type` is an item type, not a caption; the row is the field list | entry `timestamp` |

URL-bearing categories: `posts_viewed`, `stories_viewed`, `videos_watched`
(Instagram post/reel URLs, shortcode extractable), `suggested_profiles_viewed`
(profile URLs, no shortcode), `link_history` (website URLs, no shortcode),
`profile_searches` (`href` profile URLs, no shortcode). A row with no URL shows
no link and no shortcode.

## 4. Name collision audit

| Display name | Registry id | Tier | Present? | Data proof |
| --- | --- | --- | --- | --- |
| Off-Meta activity | `your_activity_off_meta_technologies` | T2 | absent | no file in `archive-2/` |
| Off-Meta activity settings | `your_activity_off_meta_technologies_settings` | T1 | present | 1 label/value entry; different basename (`..._settings.json`) |
| Ad categories used to reach you | `other_categories_used_to_reach_you` | T2 | present | 1 entry, `Name` vec of 4 names |
| Advertisers using your data | `advertisers_using_your_activity_or_information` | T2 | present | 1 entry, three `vec` lists (2,495 names in the first) |
| Ad preferences | `ad_preferences` | T1 | present | 1 label/value entry, six labels, no URL/media |
| Interest categories | `interest_categories` | T2 | absent | no file in `archive-2/` |
| Your topics | `recommended_topics` | T2 | absent | no file in `archive-2/` |
| Locations of interest | `locations_of_interest` | T2 | present | 1 entry, 5-place `vec` + usage explanation |

The five absent T2 rows and their registry ids:

| Display name | Registry id |
| --- | --- |
| Password changes | `password_change_activity` |
| Interest categories | `interest_categories` |
| Off-Meta activity | `your_activity_off_meta_technologies` |
| Your topics | `recommended_topics` |
| Ads viewed | `ads_viewed` |

## 5. Dependency risk — the location categories

- `last_known_location` has `Precise latitude`, `Precise longitude`,
  `Imprecise latitude`, `Imprecise longitude` as **text** values, plus a GPS
  timestamp. It could feed a map.
- `profile_based_in` has a `Location` dict with `Country`, `Region`, `City` —
  no coordinates. A map is not possible from this data.
- `locations_of_interest` has five place **names**, not coordinates. A map is
  not possible from this data either.

A map needs a library and, in practice, tiles. The smallest sensible library,
Leaflet 1.9.4, is **42,356 bytes gzipped** (`dist/leaflet.js`, measured from the
npm tarball) — larger than the **11 kB** headroom the M21 brief sets. It does not
fit that budget. Remote tiles would also violate AGENTS §1.1, and a local map
would need geodata that the export does not contain.

**Decision:** no map dependency in M21. `last_known_location` and
`profile_based_in` use the settings screen as a field list; `locations_of_interest`
is a name/place list. A real map is blocked on a decision only the owner can make.

## 6. Screen assignment

| Screen | Categories | Count |
| --- | --- | ---: |
| Event list (month → day → row) | the 16 dated event/activity categories in §2 | 16 |
| Settings (existing T1 screen) | `signup_details`, `subscription_for_no_ads`, `last_known_location`, `profile_based_in` | 4 |
| Profile + media (existing media layer) | `personal_information` | 1 |
| Name/place list (paginated; not built in M21) | `advertisers_using_your_activity_or_information`, `other_categories_used_to_reach_you`, `locations_of_interest` | 3 |

The 16 event lists are the input to commit 3. The settings reuse, the profile
photo and the location field lists are the input to commit 4. The three
name/place lists are genuinely different and stay on the generic view in M21;
they are the next measured design, not a second event list.
