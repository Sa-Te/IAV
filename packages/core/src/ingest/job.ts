/**
 * The ingest job state machine.
 *
 * This file exists because of the bug that started the rewrite: a UI that could
 * say "still loading" forever. There is no boolean in here, and `parsing` cannot
 * be constructed without `done` and `total`, so "loading" is always a claim about
 * measurable progress. A job that was interrupted mid-parse is recovered as a
 * failure, never resumed silently — a closed tab must not leave a stuck state.
 */

export type IngestPhase = "reading" | "resolving" | "storing";

export type IngestFailureReason =
  | "not-a-zip"
  | "html-export"
  | "insufficient-space"
  | "corrupt-entry"
  | "cancelled"
  | "interrupted";

export interface UnrecognisedShape {
  readonly basename: string;
  readonly kind: "array" | "object" | "scalar";
  /** First 12 keys only: enough to recognise the shape, never the content. */
  readonly keys: readonly string[];
  readonly entryCount: number;
}

export interface IngestSummary {
  readonly categories: number;
  readonly entries: number;
  readonly mediaStored: number;
  readonly mediaMissing: number;
  /** Media-looking entries no reference resolved to. Counted, never stored. */
  readonly mediaOrphans: number;
  readonly unrecognised: readonly UnrecognisedShape[];
  readonly fingerprint: string;
  readonly durationMs: number;
}

export type IngestJob =
  | { readonly status: "idle" }
  | {
      readonly status: "parsing";
      readonly phase: IngestPhase;
      readonly done: number;
      readonly total: number;
    }
  | { readonly status: "ready"; readonly summary: IngestSummary }
  | { readonly status: "failed"; readonly reason: IngestFailureReason; readonly detail: string };

export const IDLE: IngestJob = { status: "idle" };

export function parsing(phase: IngestPhase, done: number, total: number): IngestJob {
  return { status: "parsing", phase, done: Math.max(0, done), total: Math.max(0, total) };
}

export function ready(summary: IngestSummary): IngestJob {
  return { status: "ready", summary };
}

export function failed(reason: IngestFailureReason, detail: string): IngestJob {
  return { status: "failed", reason, detail };
}

export function isRunning(job: IngestJob): boolean {
  return job.status === "parsing";
}

/**
 * Startup recovery. Anything persisted mid-parse is, by definition, a parse that
 * did not finish — the tab closed, the process died, the device slept forever.
 * It is reported as `interrupted` with a message the user can act on.
 */
export function recoverPersistedJob(job: IngestJob | null | undefined): IngestJob {
  if (job === null || job === undefined) {
    return IDLE;
  }
  if (job.status === "parsing") {
    return failed(
      "interrupted",
      `The import stopped during "${job.phase}" at ${job.done} of ${job.total}. It was not resumed; start again to import.`,
    );
  }
  return job;
}

/** Human wording for the harness. Every reason has one, and every reason is testable. */
export function describeFailure(reason: IngestFailureReason): string {
  switch (reason) {
    case "not-a-zip":
      return "That file is not a ZIP archive.";
    case "html-export":
      return "This is the HTML export. Re-request your information from Instagram and choose JSON.";
    case "insufficient-space":
      return "There is not enough free space on this device to store the archive.";
    case "corrupt-entry":
      return "The archive is damaged: one of its files could not be read.";
    case "cancelled":
      return "The import was cancelled.";
    case "interrupted":
      return "The import was interrupted before it finished.";
  }
}
