/**
 * Where a media item came from, derived from its archive path (D5, ADR 0021).
 *
 * No stored field: the path already identifies the family, the thread folder and
 * the filename. This is the pure half; the views only format it.
 */

export type MediaProvenance =
  | {
      readonly kind: "message";
      readonly family: "inbox" | "message_requests";
      readonly threadFolder: string;
      readonly filename: string;
    }
  | { readonly kind: "category"; readonly categoryId: string };

function segmentsOf(path: string): readonly string[] {
  return path
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment !== "");
}

/**
 * `your_instagram_activity/messages/<family>/<thread>/<kind>/<filename>`
 * → the message branch.
 * `media/<categoryId>/<YYYYMM>/<filename>` → the category branch.
 *
 * A path that matches neither still returns the category branch with
 * `unrecognised`, so callers have one exhaustive union and no null-to-render.
 */
export function mediaProvenance(path: string): MediaProvenance {
  const parts = segmentsOf(path);
  const filename = parts[parts.length - 1] ?? "";

  const messagesAt = parts.indexOf("messages");
  if (messagesAt >= 0) {
    const family = parts[messagesAt + 1];
    const threadFolder = parts[messagesAt + 2];
    if (
      (family === "inbox" || family === "message_requests") &&
      threadFolder !== undefined &&
      threadFolder !== "" &&
      filename !== ""
    ) {
      return { kind: "message", family, threadFolder, filename };
    }
  }

  const mediaAt = parts.indexOf("media");
  const categoryId = mediaAt >= 0 ? parts[mediaAt + 1] : undefined;
  return {
    kind: "category",
    categoryId: categoryId !== undefined && categoryId !== "" ? categoryId : "unrecognised",
  };
}
