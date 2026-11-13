import type { CategorySource } from "../ingest/port.js";
import { entriesOf, payloadsOf } from "./entries.js";
import { localisedDate } from "./format.js";

/**
 * `avatar_items` as a screen can render it.
 *
 * The measured shape is `{item, type, acquisition_time}` and `item` is an
 * absolute URL, not base64 and not local image bytes (docs/T1-DESIGN.md §2).
 * Nothing here fetches it: the view can only show a placeholder and the link.
 * `null` means the record does not match this shape and must keep its old view.
 */

export interface AvatarItem {
  readonly ordinal: number;
  readonly item: string;
  readonly type: string;
  readonly acquiredAt: number | null;
  /** Localised acquisition time; null when absent or the export's 0 sentinel. */
  readonly acquiredDate: string | null;
  /**
   * Unix seconds from the URL's `oe` parameter, when it is a signed CDN URL.
   * Facebook signs the link with a secret we do not have; an expired value
   * cannot be refreshed locally. Null means the URL is unsigned.
   */
  readonly expiresAt: number | null;
}

export interface AvatarItemsView {
  readonly kind: "avatar-items";
  readonly items: readonly AvatarItem[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** `oe` is a hex Unix timestamp on Facebook's signed CDN URLs. */
function expiresAtOf(url: string): number | null {
  const query = url.split("?")[1];
  if (query === undefined) return null;
  for (const part of query.split("&")) {
    const [key, value] = part.split("=");
    if (key !== "oe" || value === undefined) continue;
    return /^[0-9a-f]+$/i.test(value) ? Number.parseInt(value, 16) : null;
  }
  return null;
}

export function toAvatarItemsView(record: {
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): AvatarItemsView | null {
  const items: AvatarItem[] = [];

  for (const payload of payloadsOf(record)) {
    const entries = entriesOf(payload);
    if (entries === null) return null;
    for (const raw of entries) {
      if (!isObject(raw) || typeof raw.item !== "string") return null;
      const acquiredAt = typeof raw.acquisition_time === "number" ? raw.acquisition_time : null;
      items.push({
        ordinal: items.length + 1,
        item: raw.item,
        type: typeof raw.type === "string" ? raw.type : "",
        acquiredAt,
        acquiredDate: acquiredAt === null || acquiredAt === 0 ? null : localisedDate(acquiredAt),
        expiresAt: expiresAtOf(raw.item),
      });
    }
  }

  return { kind: "avatar-items", items };
}
