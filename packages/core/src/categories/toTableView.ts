import type { CategorySource } from "../ingest/port.js";
import { findCategory } from "../registry/categories.js";
import { fixMojibake } from "../strings/fixMojibake.js";

/**
 * Archive category → something a view can render without knowing the archive.
 *
 * Instagram wrote ~30 categories as a label/value envelope: either an array of
 * `{fbid, label_values, media, timestamp}` or a single such object. Others are a
 * named wrapper around a list (`{impressions_history_posts_seen: [...]}`), and
 * some carry `string_map_data`, whose *keys are display strings* ("Saved on").
 *
 * All of that is interpretation, so it lives here, in core, where it is testable
 * without a DOM (AGENTS.md §2, §3 "pull complexity downward"). The view is dumb:
 * it renders a table or a tree and nothing else.
 *
 * **Labels are never translated or prettified.** If the export says
 * `armadillo_devices`, the column header says `armadillo_devices`. Renaming what
 * a person's data is called is a silent interpretation, which is the thing this
 * module exists to avoid. Mojibake repair is the one transformation applied, and
 * it is the export's own text restored (ADR 0003), not a new string.
 */

export interface Cell {
  /** The value as the export wrote it. For a timestamp: the raw number. */
  readonly text: string;
  /** A second presentation of the *same* value — a localised date for a
   * timestamp. Never replaces `text`. */
  readonly secondary?: string;
}

export interface TableView {
  readonly kind: "table";
  readonly columns: readonly string[];
  readonly rows: readonly (readonly Cell[])[];
  readonly total: number;
}

export interface TreeView {
  readonly kind: "tree";
  readonly value: unknown;
}

export type CategoryViewData = TableView | TreeView;

/** AGENTS.md §7: 100 rows per page; windowing is not needed at these sizes. */
export const PAGE_SIZE = 100;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** One label/value pair taken verbatim from an entry. */
type Pair = readonly [label: string, value: unknown];

/** `label_values` entries are `{label, value}` in some exports and
 * `{label, vec: [{value}]}` in others; both were measured in archive-2/. */
function fromLabelValues(entry: Record<string, unknown>): readonly Pair[] | null {
  const labels = entry.label_values;
  if (!Array.isArray(labels)) return null;

  const pairs: Pair[] = [];
  for (const item of labels) {
    if (!isObject(item) || typeof item.label !== "string") continue;
    // A label is display text, not a structural key, so mojibake repair applies
    // here even though `normaliseStrings` deliberately leaves keys alone.
    const label = fixMojibake(item.label);
    if ("value" in item) {
      pairs.push([label, item.value]);
      continue;
    }
    const [first] = Array.isArray(item.vec) ? item.vec : [];
    pairs.push([label, isObject(first) ? first.value : first]);
  }
  return pairs;
}

/** `string_map_data` is keyed by a display string; the key becomes the label. */
function fromStringMap(entry: Record<string, unknown>): readonly Pair[] | null {
  const map = entry.string_map_data;
  if (!isObject(map)) return null;

  return Object.entries(map).map(([label, raw]) => {
    const repaired = fixMojibake(label);
    if (!isObject(raw)) return [repaired, raw];
    if ("value" in raw) return [repaired, raw.value];
    // `{timestamp}` stays an object so the cell can show the raw number *and* a
    // localised date (cellFor), rather than flattening it to a bare number here.
    return [repaired, raw];
  });
}

function labelsOf(entry: Record<string, unknown>): readonly Pair[] | null {
  return fromLabelValues(entry) ?? fromStringMap(entry);
}

function entriesOf(data: unknown): readonly unknown[] | null {
  if (Array.isArray(data)) return data;
  if (!isObject(data)) return null;

  // A single envelope object is one row.
  if (labelsOf(data) !== null) return [data];

  // A named wrapper around a list: `{ig_stories: [...]}`.
  const keys = Object.keys(data);
  const [onlyKey] = keys;
  const child = onlyKey === undefined ? undefined : data[onlyKey];
  if (keys.length === 1 && Array.isArray(child)) return child;
  return null;
}

function textOf(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return fixMojibake(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function isTimestampObject(value: unknown): value is { timestamp: number } {
  return isObject(value) && typeof value.timestamp === "number";
}

function localisedDate(timestamp: number): string {
  // The export's timestamps are Unix seconds, not milliseconds.
  const date = new Date(timestamp * 1000);
  return Number.isNaN(date.getTime()) ? "invalid date" : date.toLocaleString();
}

function cellFor(value: unknown): Cell {
  if (isTimestampObject(value)) {
    return { text: String(value.timestamp), secondary: localisedDate(value.timestamp) };
  }
  return { text: textOf(value) };
}

function timestampColumn(entry: Record<string, unknown>): readonly Pair[] {
  return typeof entry.timestamp === "number" ? [["timestamp", { timestamp: entry.timestamp }]] : [];
}

function columnsForEmpty(recordId: string): readonly string[] {
  // Nothing in the payload names a label, so the only honest column names are the
  // keys that were measured for this category in the registry (ADR 0008).
  const category = findCategory(recordId);
  const [first] = category?.signatures ?? [];
  const keys = first?.requiredKeys ?? [];
  // The envelope's own keys are not labels; when the measured shape is an
  // envelope, say so rather than invent a header set.
  return keys.filter((key) => key !== "fbid" && key !== "media");
}

/**
 * A category fed by several files is stored additively (`mergePayloads`): lists
 * concatenated when every file is a list, otherwise one payload per file. The
 * `sources` say which of the two happened, so no shape is guessed here.
 */
function payloadsOf(record: {
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): readonly unknown[] {
  const sources = record.sources;
  if (sources === undefined || sources.length <= 1) return [record.data];
  if (sources.every((source) => source.kind === "array")) return [record.data];
  return Array.isArray(record.data) ? record.data : [record.data];
}

/**
 * The four observed shapes, in order:
 *
 * 1. **array of envelopes** — one row per element, columns from `label_values`;
 * 2. **single envelope object** — one row;
 * 3. **named wrapper** — unwrap the one array-valued key, then 1 or 2;
 * 4. **anything else** (including "no labels anywhere") — `TreeView`.
 *
 * An empty array is still a table: it has a measured shape and zero rows, which
 * is different from "we cannot read this".
 */
export function toTableView(record: {
  readonly id: string;
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): CategoryViewData {
  const columns: string[] = [];
  const rowMaps: Map<string, Cell>[] = [];

  for (const payload of payloadsOf(record)) {
    const entries = entriesOf(payload);
    // One uninterpretable file makes the whole category raw: a table built from
    // the readable half would hide the other half behind a confident-looking grid.
    if (entries === null) {
      return { kind: "tree", value: record.data };
    }

    for (const entry of entries) {
      if (!isObject(entry)) return { kind: "tree", value: record.data };
      const pairs = labelsOf(entry);
      if (pairs === null) return { kind: "tree", value: record.data };

      const rowCells = new Map<string, Cell>();
      for (const [label, value] of [...pairs, ...timestampColumn(entry)]) {
        if (!columns.includes(label)) columns.push(label);
        // Two entries carrying the same label are two values of the same column;
        // inside one row the later value wins, which is a shape artefact of the
        // envelope, not a lost file.
        rowCells.set(label, cellFor(value));
      }
      rowMaps.push(rowCells);
    }
  }

  // An empty payload has no label to name a column. The measured keys are the only
  // honest headers, and a table with zero rows is still more truthful than a tree.
  if (columns.length === 0) {
    const headers = columnsForEmpty(record.id);
    return {
      kind: "table",
      columns: headers,
      rows: rowMaps.map(() => headers.map(() => ({ text: "" }))),
      total: rowMaps.length,
    };
  }

  const rows = rowMaps.map((cells) => columns.map((column) => cells.get(column) ?? { text: "" }));
  return { kind: "table", columns, rows, total: rows.length };
}
