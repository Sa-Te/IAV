/**
 * Privacy tier 4 — third-party identities.
 * Ids, tiers and risks come from docs/DATA-MAP.md; shapes from docs/archive-manifest.md.
 */
import type { Category } from "../types.js";

export const TIER_4: readonly Category[] = [
  {
    id: "secret_conversations",
    label: "Secret conversations",
    privacyTier: 4,
    variantRisk: "high",
    match: { basenames: [/^secret_conversations(?:_\d+)?\.json$/i] },
    signatures: [{ kind: "object", requiredKeys: ["ig_secret_conversations"] }],
    mediaPath: "none",
  },
  {
    id: "removed_suggestions",
    label: "Dismissed suggestions",
    privacyTier: 4,
    variantRisk: "low",
    match: { basenames: [/^removed_suggestions(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["relationships_dismissed_suggested_users"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "object", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "restricted_profiles",
    label: "Restricted profiles",
    privacyTier: 4,
    variantRisk: "low",
    match: { basenames: [/^restricted_profiles(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["relationships_restricted_users"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "hide_story_from",
    label: "Hidden from story",
    privacyTier: 4,
    variantRisk: "low",
    match: { basenames: [/^hide_story_from(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["relationships_hide_stories_from"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "close_friends",
    label: "Close friends",
    privacyTier: 4,
    variantRisk: "low",
    match: { basenames: [/^close_friends(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["relationships_close_friends"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "recent_follow_requests",
    label: "Permanent follow requests",
    privacyTier: 4,
    variantRisk: "medium",
    match: { basenames: [/^recent_follow_requests(?:_\d+)?\.json$/i] },
    signatures: [
      {
        kind: "object",
        requiredKeys: ["relationships_permanent_follow_requests"],
      },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "follow_requests_you've_received",
    label: "Follow requests received",
    privacyTier: 4,
    variantRisk: "high",
    // The filename contains an apostrophe. Matched against the raw basename.
    // The basename is also written by the Threads app in another folder, so the
    // parent folder is the discriminator (ADR 0002, ADR 0018). Measured in M23:
    // the two files hold disjoint people (0 of 29 in common).
    match: {
      basenames: [/^follow_requests_you've_received(?:_\d+)?\.json$/i],
      parentSegment: /^followers_and_following$/i,
    },
    signatures: [
      { kind: "object", requiredKeys: ["relationships_follow_requests_received"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990), connections/ file: the
      // label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "threads_follow_requests_received",
    label: "Threads follow requests",
    privacyTier: 4,
    variantRisk: "high",
    // Same basename as the row above, different app and different shape. The
    // parent folder is the only discriminator; tier 2 alone would be a guess.
    match: {
      basenames: [/^follow_requests_you've_received(?:_\d+)?\.json$/i],
      parentSegment: /^threads$/i,
    },
    // Measured in archive-2/ (2026-11-14): one object wrapper per file, entries of
    // `string_list_data` with a threads.com profile URL.
    signatures: [
      { kind: "object", requiredKeys: ["text_post_app_text_post_app_follow_requests_received"] },
    ],
    mediaPath: "none",
  },
  {
    id: "recently_unfollowed_profiles",
    label: "Recently unfollowed",
    privacyTier: 4,
    variantRisk: "low",
    match: { basenames: [/^recently_unfollowed_profiles(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["relationships_unfollowed_users"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "blocked_profiles",
    label: "Blocked profiles",
    privacyTier: 4,
    variantRisk: "low",
    match: { basenames: [/^blocked_profiles(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["relationships_blocked_users"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "following_hashtags",
    label: "Following hashtags",
    privacyTier: 4,
    variantRisk: "low",
    match: { basenames: [/^following_hashtags(?:_\d+)?\.json$/i] },
    signatures: [{ kind: "object", requiredKeys: ["relationships_following_hashtags"] }],
    mediaPath: "none",
  },
  {
    id: "pending_follow_requests",
    label: "Follow requests sent",
    privacyTier: 4,
    variantRisk: "medium",
    match: { basenames: [/^pending_follow_requests(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["relationships_follow_requests_sent"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "followers",
    label: "Followers",
    privacyTier: 4,
    variantRisk: "medium",
    match: { basenames: [/^followers(?:_\d+)?\.json$/i] },
    signatures: [
      {
        kind: "array",
        requiredKeys: ["title", "string_list_data", "media_list_data"],
      },
    ],
    mediaPath: "none",
  },
  {
    id: "synced_contacts",
    label: "Synced contacts",
    privacyTier: 4,
    // The one T4 row that gates (D2): address-book names and contact details
    // belong to people who did not choose this app and may not use Instagram.
    gated: true,
    variantRisk: "low",
    match: { basenames: [/^synced_contacts(?:_\d+)?\.json$/i] },
    signatures: [{ kind: "object", requiredKeys: ["contacts_contact_info"] }],
    mediaPath: "none",
  },
  {
    id: "following",
    label: "Following",
    privacyTier: 4,
    variantRisk: "low",
    match: { basenames: [/^following(?:_\d+)?\.json$/i] },
    signatures: [{ kind: "object", requiredKeys: ["relationships_following"] }],
    mediaPath: "none",
  },
];
