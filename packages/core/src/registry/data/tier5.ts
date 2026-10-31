/**
 * Privacy tier 5 — third-party authored text. Built deliberately, never by accident.
 * Shapes from docs/archive-manifest.md §3. Both families share the basename
 * `message_1.json`, so the parent folder is the discriminator (ADR 0002).
 */
import type { Category } from "../types.js";

export const TIER_5: readonly Category[] = [
  {
    id: "messages_requests",
    label: "Message requests",
    privacyTier: 5,
    variantRisk: "high",
    match: {
      basenames: [/^message(?:_\d+)?\.json$/i],
      parentSegment: /^message_requests$/i,
    },
    signature: {
      kind: "object",
      requiredKeys: ["participants", "messages", "title", "thread_path", "is_pending"],
    },
    mediaPath: "thread-relative",
  },
  {
    id: "messages_inbox",
    label: "Messages",
    privacyTier: 5,
    variantRisk: "high",
    match: {
      basenames: [/^message(?:_\d+)?\.json$/i],
      parentSegment: /^inbox$/i,
    },
    // A request also carries is_still_participant, so `absentKeys` is what lets
    // tier 2 separate the two families when the folder name is unrecognisable.
    signature: {
      kind: "object",
      requiredKeys: ["participants", "messages", "title", "thread_path", "is_still_participant"],
      absentKeys: ["is_pending"],
    },
    mediaPath: "thread-relative",
  },
];
