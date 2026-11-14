import type { CategorySource } from "../ingest/port.js";
import { entriesOf } from "./entries.js";

/**
 * `following_hashtags` is a list of topics, not people (docs/T4-DESIGN.md §7).
 * Its entry is structurally identical to a follower's, so the category decides
 * the screen; initials and a person card would be a lie about what it contains.
 */

export interface TagEntry {
  /** The tag as the export writes it, without a leading `#`. */
  readonly tag: string;
  /** The export's own tag-page URL; null when the file carries none. */
  readonly url: string | null;
  /** Unix seconds; null when the entry carries no date. */
  readonly timestamp: number | null;
}

export interface TagListView {
  readonly kind: "tags";
  readonly tags: readonly TagEntry[];
  readonly total: number;
  readonly hasDates: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function toTagListView(record: {
  readonly id: string;
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): TagListView | null {
  if (record.id !== "following_hashtags") return null;

  const entries = entriesOf(record.data);
  if (entries === null) return null;

  const tags: TagEntry[] = [];
  for (const entry of entries) {
    if (!isObject(entry)) continue;
    const list = Array.isArray(entry.string_list_data) ? entry.string_list_data : [];
    const item = list.find((candidate) => isObject(candidate));
    if (!isObject(item)) continue;
    const tag = text(item.value);
    if (tag === "") continue;

    tags.push({
      tag,
      url: typeof item.href === "string" && item.href !== "" ? item.href : null,
      timestamp: typeof item.timestamp === "number" && item.timestamp > 0 ? item.timestamp : null,
    });
  }

  if (tags.length === 0) return null;
  return {
    kind: "tags",
    tags,
    total: tags.length,
    hasDates: tags.some((tag) => tag.timestamp !== null),
  };
}
