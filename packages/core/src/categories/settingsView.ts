import type { CategorySource } from "../ingest/port.js";
import { entriesOf, payloadsOf } from "./entries.js";
import { localisedDate, textOf } from "./format.js";
import { labelItemsOf, type LabelItem } from "./labelValues.js";

/**
 * A category record as a settings screen can render it.
 *
 * This is interpretation, so it lives in core (AGENTS.md §2). The view receives a
 * tree of labelled fields and never learns that `label_values`, `dict`, `vec`,
 * `timestamp_value` or `string_map_data` exist.
 *
 * `null` means "this record is not a label/value category" — the caller falls
 * back to the table or the raw tree rather than showing a confident empty screen.
 */

export type SettingValue =
  | { readonly kind: "text"; readonly text: string; readonly href?: string }
  | { readonly kind: "timestamp"; readonly raw: number; readonly date: string | null }
  | { readonly kind: "absent" }
  | { readonly kind: "list"; readonly fields: readonly SettingField[] };

export interface SettingField {
  readonly label: string;
  readonly title?: string;
  readonly description?: string;
  readonly value: SettingValue;
}

export interface SettingEntry {
  readonly ordinal: number;
  readonly fields: readonly SettingField[];
}

export interface SettingsView {
  readonly kind: "settings";
  readonly entries: readonly SettingEntry[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function timestampValue(raw: number): SettingValue {
  // The export writes 0 for "not set". A 1970 date would be an invented event;
  // the raw number stays visible and the date is omitted.
  return { kind: "timestamp", raw, date: raw === 0 ? null : localisedDate(raw) };
}

function fieldsFromVec(vec: readonly unknown[]): readonly SettingField[] {
  return vec.map((element, index) => {
    if (isObject(element) && typeof element.label === "string") {
      const [item] = labelItemsOf({ label_values: [element] }) ?? [];
      if (item !== undefined) return fieldFrom(item);
    }
    return {
      label: `Item ${index + 1}`,
      value: { kind: "text", text: textOf(element) },
    };
  });
}

function fieldFrom(item: LabelItem): SettingField {
  const base = {
    label: item.label,
    ...(item.title === undefined ? {} : { title: item.title }),
    ...(item.description === undefined ? {} : { description: item.description }),
  };

  if (item.dict !== undefined) {
    return { ...base, value: { kind: "list", fields: item.dict.map(fieldFrom) } };
  }
  if (item.vec !== undefined) {
    return { ...base, value: { kind: "list", fields: fieldsFromVec(item.vec) } };
  }
  if (item.timestamp !== undefined) {
    return { ...base, value: timestampValue(item.timestamp) };
  }
  if (item.hasValue) {
    return {
      ...base,
      value: {
        kind: "text",
        text: textOf(item.value),
        ...(item.href === undefined ? {} : { href: item.href }),
      },
    };
  }
  return { ...base, value: { kind: "absent" } };
}

function fieldsOf(entry: Record<string, unknown>): readonly SettingField[] | null {
  const items = labelItemsOf(entry);
  if (items === null) return null;

  const fields = items.map(fieldFrom);
  if (typeof entry.timestamp === "number") {
    // The envelope's own key, kept verbatim as the label. It is metadata, not a
    // setting, but hiding it would drop a value the table used to show.
    fields.push({ label: "timestamp", value: timestampValue(entry.timestamp) });
  }
  return fields;
}

export function toSettingsView(record: {
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): SettingsView | null {
  const entries: SettingEntry[] = [];

  for (const payload of payloadsOf(record)) {
    const rawEntries = entriesOf(payload);
    if (rawEntries === null) return null;
    for (const raw of rawEntries) {
      if (!isObject(raw)) return null;
      const fields = fieldsOf(raw);
      if (fields === null) return null;
      entries.push({ ordinal: entries.length + 1, fields });
    }
  }

  return { kind: "settings", entries };
}
