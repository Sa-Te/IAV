import { useEffect, useMemo, useState, type JSX } from "react";

import {
  clearLogs,
  logEntries,
  subscribeLogs,
  type LogEntry,
  type LogLevel,
} from "../ui/logBuffer.js";

/**
 * `/dev/logs` — the instrument for browser-only failures.
 *
 * Its whole reason to exist is on the page: a description of a symptom is not
 * evidence, a stack trace with a timestamp is.
 */

export function DevLogs(): JSX.Element {
  const [entries, setEntries] = useState<readonly LogEntry[]>(logEntries);
  const [filter, setFilter] = useState<"all" | LogLevel>("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => subscribeLogs(setEntries), []);

  const visible = useMemo(
    () => (filter === "all" ? entries : entries.filter((entry) => entry.level === filter)),
    [entries, filter],
  );

  const copyAll = async (): Promise<void> => {
    const text = visible
      .map(
        (entry) =>
          `${new Date(entry.ts).toISOString()} ${entry.level.toUpperCase()} [${entry.source}] ${entry.message}${entry.stack === undefined ? "" : `\n${entry.stack}`}`,
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="gallery">
      <h1>Dev logs</h1>
      <p className="summary">
        This page exists because browser-only failures were arriving as descriptions instead of
        stack traces.
      </p>

      <div className="pager">
        <button
          type="button"
          className="button"
          onClick={() => setFilter(filter === "all" ? "error" : "all")}
        >
          {filter === "all" ? "Show errors only" : "Show everything"}
        </button>
        <button type="button" className="button" onClick={() => void copyAll()}>
          {copied ? "Copied" : "Copy all"}
        </button>
        <button type="button" className="button" onClick={clearLogs}>
          Clear
        </button>
        <p role="status" aria-live="polite">
          {visible.length} of {entries.length} entries
        </p>
      </div>

      <table>
        <caption>Newest at the bottom</caption>
        <thead>
          <tr>
            <th scope="col">time</th>
            <th scope="col">level</th>
            <th scope="col">source</th>
            <th scope="col">message</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((entry, index) => (
            <tr key={`${entry.ts}:${index}`}>
              <td>{new Date(entry.ts).toLocaleTimeString()}</td>
              <td>{entry.level}</td>
              <td>{entry.source}</td>
              <td>
                <code>{entry.message}</code>
                {entry.stack !== undefined && (
                  <pre>
                    <code>{entry.stack}</code>
                  </pre>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
