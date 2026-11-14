import { useRef } from "react";

import { IngestStatus } from "../import/IngestStatus.js";
import { useIngestJob } from "../import/useIngestJob.js";

/**
 * Dev harness, not the product UI. It uses the same ingest session and status
 * renderer as `/import`; the only extra is the destructive Clear control that is
 * useful while developing against a real archive.
 */

const WIPE_WARNING =
  "This deletes the archive on this device: every category and every media file. It cannot be undone.";

export function DevIngest() {
  const { job, elapsedMs, protocolError, start, cancel, retry, clear } = useIngestJob();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const wipe = (): void => {
    if (!window.confirm(WIPE_WARNING)) return;
    clear();
  };

  return (
    <main>
      <h1>Ingest harness</h1>
      <p>Dev-only route. A ZIP goes in; categories and media go to IndexedDB on this device.</p>

      <section>
        <h2>Import</h2>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          disabled={job.status === "parsing"}
          aria-label="Choose an Instagram export ZIP"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file !== undefined) void start(file);
          }}
        />
      </section>

      <section aria-live="polite">
        <h2>Status</h2>
        <IngestStatus
          job={job}
          elapsedMs={elapsedMs}
          idleMessage="No archive on this device. Choose a ZIP to import."
          onCancel={cancel}
          onRetry={retry}
          onClear={clear}
        />
        {protocolError !== null && (
          <p role="alert">
            <strong>Worker error:</strong> {protocolError}
          </p>
        )}
      </section>

      <section>
        <h2>Wipe</h2>
        <button type="button" onClick={wipe}>
          Wipe archive
        </button>
        <p>
          <small>{WIPE_WARNING}</small>
        </p>
      </section>
    </main>
  );
}
