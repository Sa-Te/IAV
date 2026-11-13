/**
 * Privacy tier 3 — your own media and content.
 * Ids, tiers and risks come from docs/DATA-MAP.md; shapes from docs/archive-manifest.md.
 */
import type { Category } from "../types.js";

export const TIER_3: readonly Category[] = [
  {
    id: "profile_photos",
    label: "Profile photos",
    privacyTier: 3,
    variantRisk: "low",
    match: { basenames: [/^profile_photos(?:_\d+)?\.json$/i] },
    signatures: [{ kind: "object", requiredKeys: ["ig_profile_picture"] }],
    mediaPath: "root-relative",
  },
  {
    id: "story_reaction_sticker_reactions",
    label: "Story reaction stickers",
    privacyTier: 3,
    variantRisk: "high",
    match: { basenames: [/^story_reaction_sticker_reactions(?:_\d+)?\.json$/i] },
    signatures: [
      {
        kind: "object",
        requiredKeys: ["story_activities_reaction_sticker_reactions"],
      },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "object", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "reels_comments",
    label: "Reels comments",
    privacyTier: 3,
    variantRisk: "medium",
    match: { basenames: [/^reels_comments(?:_\d+)?\.json$/i] },
    signatures: [{ kind: "object", requiredKeys: ["comments_reels_comments"] }],
    mediaPath: "none",
  },
  {
    id: "questions",
    label: "Story questions",
    privacyTier: 3,
    variantRisk: "high",
    match: { basenames: [/^questions(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["story_activities_questions"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "emoji_sliders",
    label: "Emoji sliders",
    privacyTier: 3,
    variantRisk: "high",
    match: { basenames: [/^emoji_sliders(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["story_activities_emoji_sliders"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "archived_posts",
    label: "Archived posts",
    privacyTier: 3,
    variantRisk: "low",
    match: { basenames: [/^archived_posts(?:_\d+)?\.json$/i] },
    signatures: [{ kind: "object", requiredKeys: ["ig_archived_post_media"] }],
    mediaPath: "root-relative",
  },
  {
    id: "quizzes",
    label: "Story quizzes",
    privacyTier: 3,
    variantRisk: "high",
    match: { basenames: [/^quizzes(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["story_activities_quizzes"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "posts",
    label: "Posts",
    privacyTier: 3,
    variantRisk: "medium",
    match: { basenames: [/^posts(?:_\d+)?\.json$/i] },
    // `media` alone is not enough to identify a posts file: measured in M22,
    // `note_and_repost_interactions.json` is an array of `{fbid, label_values,
    // media}` envelopes and was being folded into posts, adding 2 records that
    // are not posts (docs/T3-DESIGN.md §2). The legacy posts file carries one key
    // per entry (`media`); the newer label/value shape is name-resolved anyway.
    signatures: [
      { kind: "array", requiredKeys: ["media"], absentKeys: ["fbid", "label_values", "timestamp"] },
    ],
    mediaPath: "root-relative",
  },
  {
    id: "reels",
    label: "Reels",
    privacyTier: 3,
    variantRisk: "medium",
    // Registered before it was ever measured: this export has no reels, and a
    // person who does post them must not see their file land in the unrecognised
    // bucket (D2). Name-resolvable only until a real reels.json is measured
    // (ADR 0008 allows an empty signature list).
    match: { basenames: [/^reels(?:_\d+)?\.json$/i] },
    signatures: [],
    // Unmeasured declaration. No reels file exists in archive-2/, so the media
    // layout has not been observed; this is the value other media categories use
    // and it must be re-checked the first time a reels.json is available.
    mediaPath: "root-relative",
  },
  {
    id: "story_likes",
    label: "Story likes",
    privacyTier: 3,
    variantRisk: "medium",
    match: { basenames: [/^story_likes(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["story_activities_story_likes"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "liked_comments",
    label: "Liked comments",
    privacyTier: 3,
    variantRisk: "low",
    match: { basenames: [/^liked_comments(?:_\d+)?\.json$/i] },
    signatures: [{ kind: "object", requiredKeys: ["likes_comment_likes"] }],
    mediaPath: "none",
  },
  {
    id: "stories",
    label: "Stories",
    privacyTier: 3,
    variantRisk: "high",
    match: { basenames: [/^stories(?:_\d+)?\.json$/i] },
    signatures: [{ kind: "object", requiredKeys: ["ig_stories"] }],
    mediaPath: "root-relative",
  },
  {
    id: "saved_collections",
    label: "Saved collections",
    privacyTier: 3,
    variantRisk: "high",
    match: { basenames: [/^saved_collections(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["saved_saved_collections"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "post_comments",
    label: "Comments",
    privacyTier: 3,
    variantRisk: "high",
    match: { basenames: [/^post_comments(?:_\d+)?\.json$/i] },
    signatures: [{ kind: "array", requiredKeys: ["media_list_data", "string_map_data"] }],
    mediaPath: "none",
  },
  {
    id: "polls",
    label: "Story polls",
    privacyTier: 3,
    variantRisk: "high",
    match: { basenames: [/^polls(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["story_activities_polls"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "saved_posts",
    label: "Saved posts",
    privacyTier: 3,
    variantRisk: "high",
    match: { basenames: [/^saved_posts(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["saved_saved_media"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "liked_posts",
    label: "Liked posts",
    privacyTier: 3,
    variantRisk: "medium",
    match: { basenames: [/^liked_posts(?:_\d+)?\.json$/i] },
    signatures: [
      { kind: "object", requiredKeys: ["likes_media_likes"] },
      // Measured in archive-2/ (2026-10-31, fmt-e57990): the label/value envelope replaced the wrapper.
      { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
    ],
    mediaPath: "none",
  },
  {
    id: "instants_interactions",
    label: "Instants interactions",
    privacyTier: 3,
    variantRisk: "medium",
    // Promoted in M7b: first seen in archive-2/ (2026-10-31). Parse and store
    // verbatim; no view in v1.
    match: { basenames: [/^instants_interactions(?:_\d+)?\.json$/i] },
    signatures: [{ kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] }],
    mediaPath: "none",
  },
  {
    id: "other_content",
    label: "Other content",
    privacyTier: 3,
    variantRisk: "medium",
    // Promoted in M7b: first seen in archive-2/ (2026-10-31). Parse and store
    // verbatim; no view in v1.
    match: { basenames: [/^other_content(?:_\d+)?\.json$/i] },
    signatures: [{ kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] }],
    mediaPath: "root-relative",
  },
];
