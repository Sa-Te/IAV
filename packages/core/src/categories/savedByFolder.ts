import type { CategorySource } from "../ingest/port.js";
import { entriesOf, payloadsOf } from "./entries.js";
import { localisedDate } from "./format.js";
import { labelItemsOf, type LabelItem } from "./labelValues.js";

/**
 * Saved posts and their collections (M22 follow-up; docs/T3-DESIGN.md §4).
 *
 * The collection file is self-contained: each collection carries its saved posts
 * nested inside a label-less container, as full records (URL, caption, title), not
 * as ids. There is no cross-file membership key — an earlier measurement looked
 * for one and concluded "no link"; the link was one level deeper, in the nesting.
 * `saved_posts.json` is the flat list of every saved post, and most posts are in no
 * collection at all (measured: 735 of 1,064 in `archive-2/`).
 *
 * Identity between a collection's nested record and the flat list is the URL, the
 * same rule `posts` uses for its media URI.
 */

export interface SavedItem {
  readonly url: string | null;
  readonly caption: string;
  readonly title: string;
  /** Unix seconds from the flat list; null when the record carries no date. */
  readonly timestamp: number | null;
  readonly date: string | null;
}

export interface SavedFolder {
  /** Stable key: the collection name, or `""` for the uncollected list. */
  readonly key: string;
  readonly name: string | null;
  readonly kind: string | null;
  readonly privacy: string | null;
  /** Localised collection update time; null when absent. */
  readonly updated: string | null;
  readonly posts: readonly SavedItem[];
}

export interface SavedByFolderView {
  readonly kind: "saved-by-folder";
  readonly folders: readonly SavedFolder[];
  /** Posts that belong to no collection; empty on the collections screen. */
  readonly loose: readonly SavedItem[];
  readonly total: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textOf(item: LabelItem | undefined): string | null {
  return item !== undefined && typeof item.value === "string" && item.value.trim() !== ""
    ? item.value
    : null;
}

function urlOfItem(item: LabelItem | undefined): string | null {
  if (item === undefined) return null;
  if (typeof item.href === "string" && /^https?:\/\//.test(item.href)) return item.href;
  if (typeof item.value === "string" && /^https?:\/\//.test(item.value)) return item.value;
  return null;
}

function postFrom(items: readonly LabelItem[]): SavedItem | null {
  const byLabel = new Map(items.map((item) => [item.label, item]));
  const url = urlOfItem(byLabel.get("URL"));
  const caption = textOf(byLabel.get("Caption")) ?? "";
  const title = textOf(byLabel.get("Title")) ?? "";
  if (url === null && caption === "" && title === "") return null;
  return { url, caption, title, timestamp: null, date: null };
}

/**
 * The posts nested in one collection: each is a `{ title, dict }` wrapper whose
 * `dict` holds the post's own labels. Containers without a label are the only
 * place the export ever puts these, which is why `labelValues.ts` drops them.
 */
function nestedPosts(raw: Record<string, unknown>): SavedItem[] {
  // The parsed items do not keep label-less containers, so this reads the raw
  // entry. `labelItemsOf` is still the reader of every labelled value.
  const rawItems = Array.isArray(raw.label_values) ? raw.label_values : [];
  const posts: SavedItem[] = [];

  const visit = (value: unknown, depth: number): void => {
    if (!Array.isArray(value) || depth > 4) return;
    for (const item of value) {
      if (!isObject(item)) continue;
      if (Array.isArray(item.dict)) {
        if (typeof item.label === "string") {
          visit(item.dict, depth + 1);
          continue;
        }
        // A label-less container: its children are either post wrappers or the
        // post's own label list.
        for (const child of item.dict) {
          if (!isObject(child)) continue;
          const childItems = Array.isArray(child.dict)
            ? (labelItemsOf({ label_values: child.dict }) ?? [])
            : [];
          const post = postFrom(childItems);
          if (post !== null) {
            posts.push(post);
            continue;
          }
          visit(child.dict, depth + 1);
        }
      }
    }
  };

  visit(rawItems, 0);
  return posts;
}

function entryItems(entry: Record<string, unknown>): readonly LabelItem[] {
  return labelItemsOf(entry) ?? [];
}

function itemsOf(record: {
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): readonly Record<string, unknown>[] | null {
  const entries: Record<string, unknown>[] = [];
  for (const payload of payloadsOf(record)) {
    const raws = entriesOf(payload);
    if (raws === null) return null;
    for (const raw of raws) {
      if (!isObject(raw)) return null;
      entries.push(raw);
    }
  }
  return entries;
}

/** A `saved_posts` record as flat items, with the URL as the identity. */
function flatPosts(raws: readonly Record<string, unknown>[]): SavedItem[] {
  return raws.flatMap((raw) => {
    const byLabel = new Map(entryItems(raw).map((item) => [item.label, item]));
    const url = urlOfItem(byLabel.get("URL"));
    const caption = textOf(byLabel.get("Caption")) ?? "";
    const title = textOf(byLabel.get("Title")) ?? "";
    if (url === null && caption === "" && title === "") return [];
    const timestamp = typeof raw.timestamp === "number" ? raw.timestamp : null;
    return [
      {
        url,
        caption,
        title,
        timestamp,
        date: timestamp === null ? null : localisedDate(timestamp),
      },
    ];
  });
}

/** Collections on their own: each folder with the posts the export nested in it. */
export function toSavedCollectionsView(record: {
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): SavedByFolderView | null {
  const raws = itemsOf(record);
  if (raws === null) return null;

  const folders: SavedFolder[] = [];
  for (const raw of raws) {
    const items = entryItems(raw);
    const byLabel = new Map(items.map((item) => [item.label, item]));
    const name = textOf(byLabel.get("Name"));
    if (name === null) return null;
    const updatedItem = byLabel.get("Update time");
    folders.push({
      key: name,
      name,
      kind: textOf(byLabel.get("Type")),
      privacy: textOf(byLabel.get("Privacy")),
      updated: updatedItem?.timestamp === undefined ? null : localisedDate(updatedItem.timestamp),
      posts: nestedPosts(raw),
    });
  }

  return {
    kind: "saved-by-folder",
    folders,
    loose: [],
    total: folders.reduce((sum, folder) => sum + folder.posts.length, 0),
  };
}

/**
 * The flat saved list, grouped by the collections that claim it.
 *
 * A post may appear in more than one collection (measured once in `archive-2/`);
 * it is shown in each, because that is what the export says. A post in none is in
 * `loose`, which is the majority and must not be hidden.
 */
export function toSavedPostsByFolder(
  record: {
    readonly data: unknown;
    readonly sources?: readonly CategorySource[];
  },
  collections: SavedByFolderView | null,
): SavedByFolderView | null {
  const raws = itemsOf(record);
  if (raws === null) return null;
  const posts = flatPosts(raws);
  // Entries that carry no URL, caption or title are not saved posts: fall back to
  // the generic view rather than claiming the category is empty.
  if (raws.length > 0 && posts.length === 0) return null;
  const byUrl = new Map<string, SavedItem>();
  for (const post of posts) {
    if (post.url !== null && !byUrl.has(post.url)) byUrl.set(post.url, post);
  }

  const claimed = new Set<string>();
  const folders: SavedFolder[] =
    collections === null
      ? []
      : collections.folders.map((folder) => ({
          ...folder,
          posts: folder.posts.map((nested) => {
            if (nested.url !== null) claimed.add(nested.url);
            return (nested.url === null ? undefined : byUrl.get(nested.url)) ?? nested;
          }),
        }));

  return {
    kind: "saved-by-folder",
    folders,
    loose: posts.filter((post) => post.url === null || !claimed.has(post.url)),
    total: posts.length,
  };
}
