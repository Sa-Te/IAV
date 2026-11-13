import type { PostEntry } from "../domain/posts.js";
import {
  postEnvelopeSchema,
  postGroupSchema,
  type RawPostEnvelope,
  type RawPostLabel,
  type RawPostMedia,
} from "../schema/posts.js";
import type { ParseResult } from "./result.js";

/**
 * `posts` has been measured in two shapes in one export, and the two describe the
 * same posts (docs/T3-DESIGN.md §2):
 *
 * - `posts_1.json` — legacy groups, 51 media records;
 * - `posts.json` — label/value envelopes, 78 media records, **containing all 51**
 *   of the legacy URIs plus 27 the legacy file does not have.
 *
 * Merging the files additively therefore double-counts 51 posts unless identity is
 * the media URI. That is the identity used here: a URI is one gallery item, and a
 * second record for it may only improve the caption or the timestamp, never add a
 * row. The envelope is preferred for the caption because it carries the post's
 * `Caption` label separately from the media title.
 */

function captionOfMedia(media: RawPostMedia): string {
  return typeof media.title === "string" ? media.title : "";
}

function captionOfEnvelope(envelope: RawPostEnvelope): string {
  const label = envelope.label_values.find((item) => item.label === "Caption");
  return label !== undefined && typeof label.value === "string" ? label.value : "";
}

function mediaOfEnvelope(envelope: RawPostEnvelope): readonly RawPostMedia[] {
  return envelope.label_values.flatMap((item: RawPostLabel) => item.media ?? []);
}

export function parsePosts(input: unknown): ParseResult<readonly PostEntry[]> {
  if (!Array.isArray(input)) {
    return { ok: false, reason: "posts.json is not the measured array of groups", raw: input };
  }

  const byUri = new Map<string, PostEntry>();
  let unknownEntries = 0;

  const add = (media: RawPostMedia, fallbackCaption: string): void => {
    const caption = captionOfMedia(media) || fallbackCaption;
    const takenAt = media.creation_timestamp;
    const existing = byUri.get(media.uri);
    if (existing === undefined) {
      byUri.set(media.uri, { id: media.uri, caption, takenAt });
      return;
    }
    // A duplicate record for the same media may fill in a missing caption or
    // timestamp. It may not create a second gallery item.
    if (existing.caption === "" && caption !== "") {
      byUri.set(media.uri, { ...existing, caption });
    }
  };

  for (const entry of input) {
    // The envelope is tried first: an envelope entry also carries an empty
    // `media` array, so the legacy group shape would match it and read nothing.
    const envelope = postEnvelopeSchema.safeParse(entry);
    if (envelope.success) {
      const caption = captionOfEnvelope(envelope.data);
      for (const media of mediaOfEnvelope(envelope.data)) {
        add(media, caption);
      }
      continue;
    }

    const group = postGroupSchema.safeParse(entry);
    if (group.success) {
      for (const media of group.data.media) add(media, "");
      continue;
    }

    // One unreadable entry must not hide the readable ones: it is counted and
    // preserved in the raw JSON, and the gallery keeps what it can render.
    unknownEntries += 1;
  }

  return {
    ok: true,
    data: [...byUri.values()],
    warnings:
      unknownEntries === 0
        ? []
        : [
            {
              code: "posts-unreadable-entry",
              detail: `${unknownEntries} posts entries matched neither measured shape`,
            },
          ],
  };
}
