import type { CategorySource } from "../ingest/port.js";
import { entriesOf, payloadsOf } from "./entries.js";
import { textOf } from "./format.js";
import { labelItemsOf } from "./labelValues.js";

/**
 * A category that is a list of names or places, not events and not settings.
 *
 * The measured shape is one entry whose labels hold `vec` arrays of `{value}`
 * objects (advertisers, ad categories, places) or one explanatory text value.
 * `null` means the record is not that shape and must keep its old view.
 */

export interface NameListSection {
  readonly label: string;
  readonly names: readonly string[];
  /** An explanatory text value beside the names, when the export has one. */
  readonly text?: string;
}

export interface NameListView {
  readonly kind: "name-list";
  readonly sections: readonly NameListSection[];
  readonly total: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function toNameListView(record: {
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): NameListView | null {
  const sections: NameListSection[] = [];

  for (const payload of payloadsOf(record)) {
    const entries = entriesOf(payload);
    if (entries === null) return null;
    for (const raw of entries) {
      if (!isObject(raw)) return null;
      const items = labelItemsOf(raw);
      if (items === null) return null;

      for (const item of items) {
        if (item.vec !== undefined) {
          const names = item.vec
            .map((element) =>
              isObject(element) && typeof element.value === "string"
                ? element.value
                : textOf(element),
            )
            .filter((name) => name !== "");
          if (names.length > 0) sections.push({ label: item.label, names });
          continue;
        }
        if (item.hasValue) {
          const text = textOf(item.value);
          if (text !== "") sections.push({ label: item.label, names: [], text });
        }
      }
    }
  }

  if (sections.length === 0) return null;
  return {
    kind: "name-list",
    sections,
    total: sections.reduce((sum, section) => sum + section.names.length, 0),
  };
}
