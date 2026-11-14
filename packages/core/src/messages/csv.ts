import type { ThreadMessage } from "./threads.js";

/**
 * One conversation as CSV, for the user's own disk (ADR 0020).
 *
 * RFC 4180: every field is quoted when it contains a comma, a quote or a line
 * break, and a quote inside a quoted field is doubled. The file starts with a
 * UTF-8 BOM so Excel reads non-ASCII, and lines end with CRLF.
 *
 * Formula injection is defended unconditionally: a cell whose first character is
 * `=`, `+`, `-`, `@` or a tab is prefixed with one apostrophe. The user's own
 * message can begin with `=HYPERLINK(`; a spreadsheet must not execute it.
 */

const BOM = "\uFEFF";
const CRLF = "\r\n";
const HEADER = ["date", "sender", "text", "attachment_count", "attachment_paths"] as const;

function needsInjectionPrefix(cell: string): boolean {
  const first = cell.charAt(0);
  return first === "=" || first === "+" || first === "-" || first === "@" || first === "\t";
}

function quote(cell: string): string {
  const guarded = needsInjectionPrefix(cell) ? `'${cell}` : cell;
  if (/[",\r\n]/.test(guarded)) return `"${guarded.replaceAll('"', '""')}"`;
  return guarded;
}

function isoDate(timestampMs: number | null): string {
  if (timestampMs === null) return "";
  const date = new Date(timestampMs);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function conversationCsv(messages: readonly ThreadMessage[]): string {
  const rows: string[] = [HEADER.map(quote).join(",")];
  for (const message of messages) {
    rows.push(
      [
        quote(isoDate(message.timestampMs)),
        quote(message.sender),
        quote(message.text),
        quote(String(message.attachments.length)),
        quote(message.attachments.map((attachment) => attachment.uri).join(";")),
      ].join(","),
    );
  }
  return `${BOM}${rows.join(CRLF)}${CRLF}`;
}

/**
 * The sanitised thread folder plus the date. Slashes, backslashes and traversal
 * are removed; the name never adds a personal name the folder did not already
 * contain.
 */
export function csvFilename(threadFolder: string, now: Date = new Date()): string {
  const date = Number.isNaN(now.getTime())
    ? "undated"
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate(),
      ).padStart(2, "0")}`;
  const safe = threadFolder
    .replace(/[\\/]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.-]+/, "")
    .replace(/[.-]+$/, "")
    .slice(0, 80);
  return `${safe === "" ? "conversation" : safe}-${date}.csv`;
}
