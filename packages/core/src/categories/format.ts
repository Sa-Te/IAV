import { fixMojibake } from "../strings/fixMojibake.js";

/** Presentation rules shared by the table and the settings screen. */

export function textOf(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return fixMojibake(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/** The export's timestamps are Unix seconds, not milliseconds. */
export function localisedDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return Number.isNaN(date.getTime()) ? "invalid date" : date.toLocaleString();
}
