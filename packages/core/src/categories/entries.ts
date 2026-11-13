import type { CategorySource } from "../ingest/port.js";
import { labelItemsOf } from "./labelValues.js";

/**
 * The two container shapes shared by every reader of a category record: the
 * entries inside one payload, and the payloads of a category fed by several files.
 */

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function entriesOf(data: unknown): readonly unknown[] | null {
  if (Array.isArray(data)) return data;
  if (!isObject(data)) return null;

  // A single envelope object is one entry.
  if (labelItemsOf(data) !== null) return [data];

  // A named wrapper around a list: `{ig_stories: [...]}`.
  const keys = Object.keys(data);
  const [onlyKey] = keys;
  const child = onlyKey === undefined ? undefined : data[onlyKey];
  if (keys.length === 1 && Array.isArray(child)) return child;
  return null;
}

/**
 * A category fed by several files is stored additively (`mergePayloads`): lists
 * concatenated when every file is a list, otherwise one payload per file. The
 * `sources` say which of the two happened, so no shape is guessed here.
 */
export function payloadsOf(record: {
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): readonly unknown[] {
  const sources = record.sources;
  if (sources === undefined || sources.length <= 1) return [record.data];
  if (sources.every((source) => source.kind === "array")) return [record.data];
  return Array.isArray(record.data) ? record.data : [record.data];
}
