import { describeFailure, type ArchiveRow } from "@instavault/core";
import { useEffect, useRef, useState, type JSX } from "react";

import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { State } from "../ui/State.js";
import { useIngestJob } from "./useIngestJob.js";

/**
 * `/import` — the production front door.
 *
 * One file input, one drop zone that uses the same control, and the export
 * instructions. Nothing is uploaded and nothing is fetched: the ZIP is read with
 * the browser's file API and parsed in a worker on this device (ADR 0001, 0020).
 * Importing replaces the one archive (ADR 0006), so an existing archive shows the
 * counts that will be deleted before the file control.
 */

const ZIP_ACCEPT = ".zip,application/zip";

function replaceWarning(archive: ArchiveRow): string {
  return `This replaces the archive on this device: ${archive.counts.categories} categories and ${archive.counts.mediaStored} media files will be deleted. This cannot be undone.`;
}

function phaseText(phase: string): string {
  if (phase === "reading") return "Reading files";
  if (phase === "resolving") return "Matching categories";
  if (phase === "storing") return "Storing media";
  return phase;
}

export function ImportPage(): JSX.Element {
  const repository = useArchiveRepository();
  const { job, elapsedMs, protocolError, start, cancel, retry } = useIngestJob();
  const [archive, setArchive] = useState<ArchiveRow | null | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void repository
      .summary()
      .then((row) => {
        if (!cancelled) setArchive(row);
      })
      .catch(() => {
        if (!cancelled) setArchive(null);
      });
    return () => {
      cancelled = true;
    };
  }, [repository, job.status]);

  const warning = archive === null || archive === undefined ? null : replaceWarning(archive);

  const choose = (file: File): void => {
    if (warning !== null && !window.confirm(warning)) {
      if (inputRef.current !== null) inputRef.current.value = "";
      return;
    }
    void start(file);
  };

  return (
    <div className="gallery import-page">
      <h1>Import your Instagram export</h1>

      <p className="import-lede">
        InstaVault turns the ZIP Instagram gives you into a gallery you can browse. The ZIP is
        opened and parsed in this tab, and everything stays on this device.
      </p>
      <p className="import-lede">
        Nothing is uploaded, nothing is fetched, and there is no account. The export is the only
        copy of your data this app can see.
      </p>

      <section className="import-section" aria-labelledby="import-file-heading">
        <h2 id="import-file-heading">Choose your export</h2>
        <label
          className="import-drop"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file !== undefined) choose(file);
          }}
        >
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept={ZIP_ACCEPT}
            disabled={job.status === "parsing" || archive === undefined}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file !== undefined) choose(file);
            }}
          />
          <span className="import-drop-title">Drop your ZIP here, or choose a file</span>
          <span className="import-drop-note">Instagram JSON export · .zip</span>
        </label>
      </section>

      <section className="import-section" aria-labelledby="import-how-heading">
        <h2 id="import-how-heading">Where do I get my export?</h2>
        <ol className="import-steps">
          <li>Instagram → Settings → Accounts Center</li>
          <li>Your information and permissions → Export your information</li>
          <li>Export to device</li>
          <li>Date range: All time</li>
          <li>
            Format: <strong>JSON</strong>
          </li>
        </ol>
        <p className="import-note">
          JSON is required. The HTML export is a different document and this app cannot parse it;
          choose JSON even though Instagram offers HTML first.
        </p>
      </section>

      {warning !== null && (
        <p className="import-warning" role="alert">
          {warning}
        </p>
      )}

      <section className="import-section" aria-labelledby="import-status-heading">
        <h2 id="import-status-heading">Progress</h2>
        {job.status === "idle" && <p className="import-note">No import has started in this tab.</p>}
        {job.status === "parsing" && (
          <p role="status" className="import-status">
            {phaseText(job.phase)} — {job.done} / {job.total} — {(elapsedMs / 1000).toFixed(1)}s
            <button type="button" className="button" onClick={cancel}>
              Cancel import
            </button>
          </p>
        )}
        {job.status === "ready" && (
          <p role="status" className="import-status">
            Import complete: {job.summary.categories} categories, {job.summary.mediaStored} media
            files. <a href="/">Open the gallery →</a>
          </p>
        )}
        {job.status === "failed" && (
          <div role="alert" className="import-status">
            <p>{describeFailure(job.reason)}</p>
            <p className="import-note">{job.detail}</p>
            <button type="button" className="button" onClick={retry}>
              Retry
            </button>
          </div>
        )}
        {protocolError !== null && (
          <p role="alert" className="import-status">
            Worker error: {protocolError}
          </p>
        )}
      </section>

      {archive !== undefined && (
        <p className="import-note">
          <a href="/">Back to the gallery</a>
        </p>
      )}

      {archive === undefined && <State kind="loading" message="Checking this device…" />}
    </div>
  );
}
