import { describeFailure, type IngestJob, type IngestPhase } from "@instavault/core";
import type { JSX } from "react";

/**
 * One renderer for the ingest job, shared by `/import` and the dev harness.
 *
 * Determinate while `total > 0`; indeterminate while the reader has not counted
 * yet. The phase is words, not the enum. Cancel is the existing abort, and a
 * failure is the human sentence plus Retry.
 */

export function phaseText(phase: IngestPhase | string): string {
  if (phase === "reading") return "Reading files";
  if (phase === "resolving") return "Matching categories";
  if (phase === "storing") return "Storing media";
  return phase;
}

export function IngestStatus({
  job,
  elapsedMs,
  idleMessage = "No import has started in this tab.",
  onCancel,
  onRetry,
  onClear,
}: {
  job: IngestJob;
  elapsedMs: number;
  idleMessage?: string;
  onCancel: () => void;
  onRetry: () => void;
  /** Dev harness only: a persisted interrupted job can be cleared. */
  onClear?: () => void;
}): JSX.Element {
  switch (job.status) {
    case "idle":
      return <p className="import-note">{idleMessage}</p>;

    case "parsing": {
      const determinate = job.total > 0;
      return (
        <div className="import-progress" aria-live="polite">
          <p className="import-status">
            <strong>{phaseText(job.phase)}</strong>
            <span>
              {job.done} / {job.total}
            </span>
            <span>{(elapsedMs / 1000).toFixed(1)}s</span>
          </p>
          <progress
            className="import-bar"
            value={determinate ? job.done : undefined}
            max={determinate ? job.total : undefined}
            aria-label={`${phaseText(job.phase)} progress`}
          />
          <button type="button" className="button" onClick={onCancel}>
            Cancel import
          </button>
        </div>
      );
    }

    case "ready":
      return (
        <div className="import-complete">
          <p>
            <strong>Import complete.</strong>
          </p>
          <table className="import-summary">
            <tbody>
              <tr>
                <th scope="row">Categories</th>
                <td>{job.summary.categories}</td>
              </tr>
              <tr>
                <th scope="row">Entries</th>
                <td>{job.summary.entries}</td>
              </tr>
              <tr>
                <th scope="row">Media stored</th>
                <td>{job.summary.mediaStored}</td>
              </tr>
              <tr>
                <th scope="row">Media missing</th>
                <td>{job.summary.mediaMissing}</td>
              </tr>
              <tr>
                <th scope="row">Unrecognised</th>
                <td>{job.summary.unrecognised.length}</td>
              </tr>
              <tr>
                <th scope="row">Fingerprint</th>
                <td>
                  <code>{job.summary.fingerprint}</code>
                </td>
              </tr>
              <tr>
                <th scope="row">Duration</th>
                <td>{job.summary.durationMs} ms</td>
              </tr>
            </tbody>
          </table>
          {job.summary.unrecognised.length > 0 && (
            <>
              <h3>Unrecognised files</h3>
              <ul>
                {job.summary.unrecognised.map((shape, index) => (
                  <li key={`${shape.basename}-${index}`}>
                    <code>{shape.basename}</code> — {shape.kind}, {shape.entryCount} entries
                    {shape.keys.length > 0 ? `, keys: ${shape.keys.join(", ")}` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      );

    case "failed":
      return (
        <div className="import-failed" role="alert">
          <p>
            <strong>{describeFailure(job.reason)}</strong>
          </p>
          <p className="import-note">{job.detail}</p>
          {job.reason === "interrupted" ? (
            onClear !== undefined && (
              <button type="button" className="button" onClick={onClear}>
                Clear archive
              </button>
            )
          ) : (
            <button type="button" className="button" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      );
  }
}
