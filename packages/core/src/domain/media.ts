import { parseArchivedPosts } from "../parsers/archivedPosts.js";
import { parseStories } from "../parsers/stories.js";
import { toPostEntries } from "./posts.js";

/**
 * Category data → the one shape every view renders.
 *
 * Each archive category stores media differently (a root array, a wrapper key, a
 * nested message attachment). This module is the single place that knows those
 * differences; views only ever see `MediaItemView`.
 */
export interface MediaItemView {
  /** Archive path; also the repository key. */
  readonly id: string;
  readonly caption: string;
  /** Unix seconds. 0 when the export omits it. */
  readonly takenAt: number;
  readonly category: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fromMediaRecords(value: unknown, category: string): MediaItemView[] {
  if (!Array.isArray(value)) return [];
  const items: MediaItemView[] = [];
  for (const record of value) {
    if (!isObject(record) || typeof record.uri !== "string") continue;
    items.push({
      id: record.uri,
      caption: typeof record.title === "string" ? record.title : "",
      takenAt: typeof record.creation_timestamp === "number" ? record.creation_timestamp : 0,
      category,
    });
  }
  return items;
}

function fromWrapper(data: unknown, key: string, category: string): MediaItemView[] {
  return isObject(data) ? fromMediaRecords(data[key], category) : [];
}

function fromMessages(data: unknown, category: string): MediaItemView[] {
  // A message category arrives as one file per thread, merged additively into a
  // list of thread payloads (M8). A single-file export still gives one object.
  const threads = Array.isArray(data) ? data : [data];
  const items: MediaItemView[] = [];
  for (const thread of threads) {
    if (!isObject(thread) || !Array.isArray(thread.messages)) continue;
    for (const message of thread.messages) {
      if (!isObject(message)) continue;
      const takenAt = typeof message.timestamp_ms === "number" ? message.timestamp_ms / 1000 : 0;
      for (const key of ["photos", "videos", "audio_files"]) {
        for (const attachment of Array.isArray(message[key]) ? message[key] : []) {
          if (!isObject(attachment) || typeof attachment.uri !== "string") continue;
          items.push({ id: attachment.uri, caption: "", takenAt, category });
        }
      }
    }
  }
  return items;
}

export function toMediaItems(categoryId: string, data: unknown): readonly MediaItemView[] {
  // Once a category has a parser, the parser is the only reader of its shape.
  if (categoryId === "stories") {
    const parsed = parseStories(data);
    return parsed.ok
      ? parsed.data.map((story) => ({
          id: story.id,
          caption: story.caption,
          takenAt: story.takenAt,
          category: "stories",
        }))
      : [];
  }
  if (categoryId === "archived_posts") {
    const parsed = parseArchivedPosts(data);
    return parsed.ok
      ? parsed.data.map((entry) => ({
          id: entry.id,
          caption: entry.caption,
          takenAt: entry.takenAt,
          category: "archived_posts",
        }))
      : [];
  }
  if (categoryId === "posts") {
    return toPostEntries(data).map((post) => ({ ...post, category: "posts" }));
  }

  switch (categoryId) {
    case "stories":
      return fromWrapper(data, "ig_stories", categoryId);
    case "profile_photos":
      return fromWrapper(data, "ig_profile_picture", categoryId);
    case "personal_information": {
      if (!isObject(data) || !Array.isArray(data.profile_user)) return [];
      const user = data.profile_user[0];
      if (!isObject(user) || !isObject(user.media_map_data)) return [];
      const photo = user.media_map_data["Profile Photo"];
      return isObject(photo) ? fromMediaRecords([photo], categoryId) : [];
    }
    case "messages_inbox":
    case "messages_requests":
      return fromMessages(data, categoryId);
    default:
      return [];
  }
}
