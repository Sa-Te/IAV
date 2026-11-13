import { toPostEntries } from "../domain/posts.js";

/**
 * The entry count a screen should print, which is not always the raw per-file sum.
 *
 * `posts` is the measured exception: one export can carry the same posts twice,
 * once as legacy groups and once as label/value envelopes (`posts.json` in
 * `archive-2/` contains all 51 legacy media records plus 27 more). The stored
 * `entryCount` is the honest sum of what the files hold — 129 — but the person
 * looking at the gallery sees 78 posts, and two numbers for the same screen is a
 * bug in the app's voice. The parser is the identity check, so ask it.
 *
 * Drift reports keep using the raw count: they describe files, not screens.
 */
export function entryCountForView(
  categoryId: string,
  record: { readonly data: unknown; readonly entryCount: number },
): number {
  if (categoryId === "posts") {
    const posts = toPostEntries(record.data);
    // A record the parser could not read keeps the stored number rather than
    // claiming the category is empty.
    return posts.length > 0 ? posts.length : record.entryCount;
  }
  return record.entryCount;
}
