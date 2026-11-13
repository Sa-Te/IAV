import { fixMojibake } from "../strings/fixMojibake.js";

/**
 * The label/value envelope, read once.
 *
 * `toTableView` flattens it into columns and the settings screen keeps its
 * structure, but both must agree on what a label, a value, a timestamp, a nested
 * list and a bare label are. That knowledge lives here so a third reader cannot
 * invent a fourth interpretation (AGENTS.md §3, "no information leakage").
 *
 * `value` is deliberately the **flat-table** value: a scalar, the first `vec`
 * element, or a `{timestamp}` object. `timestamp_value` is exposed separately so
 * the settings screen can show a date without changing what the table does.
 */

export interface LabelItem {
  readonly label: string;
  /** What a flat cell shows. `undefined` for a nested list or a bare label. */
  readonly value: unknown;
  readonly hasValue: boolean;
  /** Set when the export used `timestamp_value` or a string-map `timestamp`. */
  readonly timestamp?: number;
  readonly dict?: readonly LabelItem[];
  readonly vec?: readonly unknown[];
  /** A section title the export supplies alongside the label. */
  readonly title?: string;
  /** The export's own explanation of the field. */
  readonly description?: string;
  /** Only kept when non-empty: an empty href is not a link. */
  readonly href?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? fixMojibake(value) : undefined;
}

function itemFrom(raw: Record<string, unknown>): LabelItem | null {
  if (typeof raw.label !== "string") return null;

  const label = fixMojibake(raw.label);
  const title = stringField(raw.title);
  const description = stringField(raw.description);
  const href = typeof raw.href === "string" && raw.href.length > 0 ? raw.href : undefined;
  const base = {
    label,
    ...(title === undefined ? {} : { title }),
    ...(description === undefined ? {} : { description }),
    ...(href === undefined ? {} : { href }),
  };

  if ("value" in raw) {
    return { ...base, value: raw.value, hasValue: true };
  }
  if (typeof raw.timestamp_value === "number") {
    return { ...base, value: undefined, hasValue: true, timestamp: raw.timestamp_value };
  }
  if (Array.isArray(raw.dict)) {
    const dict = raw.dict
      .map((child) => (isObject(child) ? itemFrom(child) : null))
      .filter((child): child is LabelItem => child !== null);
    return { ...base, value: undefined, hasValue: true, dict };
  }
  if (Array.isArray(raw.vec)) {
    const [first] = raw.vec;
    return {
      ...base,
      value: isObject(first) && "value" in first ? first.value : first,
      hasValue: true,
      vec: raw.vec,
    };
  }
  return { ...base, value: undefined, hasValue: false };
}

function fromStringMap(map: Record<string, unknown>): readonly LabelItem[] {
  return Object.entries(map).map(([key, raw]) => {
    const label = fixMojibake(key);
    if (!isObject(raw)) return { label, value: raw, hasValue: true };

    const href = typeof raw.href === "string" && raw.href.length > 0 ? raw.href : undefined;
    const link = href === undefined ? {} : { href };
    const timestamp = typeof raw.timestamp === "number" ? raw.timestamp : undefined;
    if ("value" in raw) {
      // The value wins, as it does in the flat table; a timestamp beside it is
      // metadata that the raw JSON still preserves.
      return { label, value: raw.value, hasValue: true, ...link };
    }
    if (timestamp !== undefined) {
      return { label, value: { timestamp }, hasValue: true, timestamp, ...link };
    }
    // A string-map entry with neither a value nor a timestamp keeps its object,
    // exactly as the flat table showed it before this module existed.
    return { label, value: raw, hasValue: true, ...link };
  });
}

/** `label_values` first, then `string_map_data`; null when neither is present. */
export function labelItemsOf(entry: Record<string, unknown>): readonly LabelItem[] | null {
  if (Array.isArray(entry.label_values)) {
    return entry.label_values
      .map((item) => (isObject(item) ? itemFrom(item) : null))
      .filter((item): item is LabelItem => item !== null);
  }
  if (isObject(entry.string_map_data)) {
    return fromStringMap(entry.string_map_data);
  }
  return null;
}
