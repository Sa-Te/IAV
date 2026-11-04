/**
 * The in-memory log ring buffer behind `/dev/logs`.
 *
 * Browser-only failures were arriving as descriptions ("the tiles are blank")
 * instead of stack traces, and a description cannot be debugged. This captures
 * what the browser already knows. Memory only: nothing is persisted, nothing is
 * sent anywhere (AGENTS §1).
 */

export type LogLevel = "error" | "warn";

export interface LogEntry {
  readonly ts: number;
  readonly level: LogLevel;
  readonly source: "console" | "window" | "rejection" | "react";
  readonly message: string;
  readonly stack?: string;
}

export const LOG_CAPACITY = 200;

let entries: LogEntry[] = [];
const listeners = new Set<(all: readonly LogEntry[]) => void>();

export function log(entry: Omit<LogEntry, "ts">): void {
  entries = [...entries, { ...entry, ts: Date.now() }];
  if (entries.length > LOG_CAPACITY) entries = entries.slice(entries.length - LOG_CAPACITY);
  for (const listener of listeners) listener(entries);
}

export function logEntries(): readonly LogEntry[] {
  return entries;
}

export function clearLogs(): void {
  entries = [];
  for (const listener of listeners) listener(entries);
}

export function subscribeLogs(listener: (all: readonly LogEntry[]) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function describe(value: unknown): { message: string; stack?: string } {
  if (value instanceof Error) {
    return value.stack === undefined
      ? { message: value.message }
      : { message: value.message, stack: value.stack };
  }
  if (typeof value === "string") return { message: value };
  try {
    return { message: JSON.stringify(value) };
  } catch {
    return { message: String(value) };
  }
}

/**
 * Wraps console.error/warn and the two window events. Every capture forwards to
 * the original first, so nothing is swallowed — the devtools console still works.
 * Returns an uninstall that restores the exact original functions.
 */
export function installLogCapture(): () => void {
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: unknown[]) => {
    originalError(...args);
    const [first, ...rest] = args;
    const described = describe(first);
    log({
      level: "error",
      source: "console",
      message: [described.message, ...rest.map((value) => describe(value).message)].join(" "),
      ...(described.stack === undefined ? {} : { stack: described.stack }),
    });
  };

  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    const [first, ...rest] = args;
    const described = describe(first);
    log({
      level: "warn",
      source: "console",
      message: [described.message, ...rest.map((value) => describe(value).message)].join(" "),
      ...(described.stack === undefined ? {} : { stack: described.stack }),
    });
  };

  const onError = (event: ErrorEvent) => {
    const described = describe(event.error ?? event.message);
    log({ level: "error", source: "window", ...described });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const described = describe(event.reason);
    log({ level: "error", source: "rejection", ...described });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    console.error = originalError;
    console.warn = originalWarn;
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
