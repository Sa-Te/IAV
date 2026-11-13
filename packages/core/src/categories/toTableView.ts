import type { CategorySource } from "../ingest/port.js";
import { findCategory } from "../registry/categories.js";
import { entriesOf, payloadsOf } from "./entries.js";
import { localisedDate, textOf } from "./format.js";
import { labelItemsOf } from "./labelValues.js";

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
  /** The value as the export wrote it, except a timestamp: that shows its date. */
  readonly text: string;
  /** Extra detail for a hover title only. Never a second visible column. */
  readonly title?: string;
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

/** The flat view of the envelope; the structure lives in `labelValues.ts`. */
function labelsOf(entry: Record<string, unknown>): readonly Pair[] | null {
  const items = labelItemsOf(entry);
  return items === null ? null : items.map((item) => [item.label, item.value] as const);
}

function isTimestampObject(value: unknown): value is { timestamp: number } {
  return isObject(value) && typeof value.timestamp === "number";
}

function cellFor(value: unknown): Cell {
  if (isTimestampObject(value)) {
    // The person reads a date. The raw Unix number is kept in the hover title and
    // in the stored record, never printed beside the date.
    return { text: localisedDate(value.timestamp), title: String(value.timestamp) };
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
