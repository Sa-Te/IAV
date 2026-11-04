import { describeFailure, type IngestJob } from "@instavault/core";
import { useCallback, useEffect, useRef, useState } from "react";

import { useListCache } from "../data/ListCacheContext.js";

/**
 * Dev harness, not the product UI (AGENTS.md: the harness is deleted or hidden
 * behind a flag at M6). Its job is to prove, in the browser, that a ZIP goes in
 * and structured data plus media land in IndexedDB.
 *
 * Plain semantic HTML on purpose: no styling system exists yet, and a visual
 * layer before there is a component to style is ceremony.
 */

const WIPE_WARNING =
  "This deletes the archive on this device: every category and every media file. It cannot be undone.";

export function DevIngest() {
  const listCache = useListCache();
  const workerRef = useRef<Worker | null>(null);
  const lastFileRef = useRef<File | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [job, setJob] = useState<IngestJob>({ status: "idle" });
  const [protocolError, setProtocolError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    // Vite only rewrites this when the URL expression is inline: hoisting it to a
    // constant silently ships no worker at all.
    const worker = new Worker(new URL("../workers/ingest.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as { type: string; job?: IngestJob; message?: string };
      if (data.type === "job" && data.job !== undefined) {
        setJob(data.job);
        if (data.job.status !== "parsing") {
          startedAtRef.current = null;
        }
      }
      if (data.type === "error") {
        setProtocolError(data.message ?? "Unknown worker error");
      }
    };
    worker.postMessage({ type: "recover" });
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  // An import replaces the archive: every cached list is now wrong.
  useEffect(() => {
    if (job.status !== "ready") return;
    listCache?.clear();
  }, [job.status, listCache]);

  useEffect(() => {
    if (job.status !== "parsing") return;
    const timer = setInterval(() => {
      const started = startedAtRef.current;
      setElapsedMs(started === null ? 0 : Date.now() - started);
    }, 250);
    return () => clearInterval(timer);
  }, [job.status]);

  const startIngest = useCallback(async (file: File) => {
    lastFileRef.current = file;
    setProtocolError(null);
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setJob({ status: "parsing", phase: "reading", done: 0, total: 0 });
    const zip = await file.arrayBuffer();
    workerRef.current?.postMessage({ type: "ingest", zip }, [zip]);
  }, []);

  const retry = useCallback(() => {
    const file = lastFileRef.current;
    if (file !== null) void startIngest(file);
  }, [startIngest]);

  const wipe = useCallback(() => {
    if (!window.confirm(WIPE_WARNING)) return;
    workerRef.current?.postMessage({ type: "clear" });
    // The archive is about to change underneath every cached list.
    listCache?.clear();
    setProtocolError(null);
  }, []);

  return (
    <main>
      <h1>Ingest harness</h1>
      <p>Dev-only route. A ZIP goes in; categories and media go to IndexedDB on this device.</p>

      <section>
        <h2>Import</h2>
        <input
          type="file"
          accept=".zip,application/zip"
          disabled={job.status === "parsing"}
          aria-label="Choose an Instagram export ZIP"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) void startIngest(file);
          }}
        />
        {job.status === "parsing" && (
          <button type="button" onClick={() => workerRef.current?.postMessage({ type: "cancel" })}>
            Cancel import
          </button>
        )}
      </section>

      <section aria-live="polite">
        <h2>Status</h2>
        <JobView job={job} elapsedMs={elapsedMs} onRetry={retry} onWipe={wipe} />
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

function JobView({
  job,
  elapsedMs,
  onRetry,
  onWipe,
}: {
  job: IngestJob;
  elapsedMs: number;
  onRetry: () => void;
  onWipe: () => void;
}) {
  switch (job.status) {
    case "idle":
      return <p>No archive on this device. Choose a ZIP to import.</p>;

    case "parsing": {
      const percent = job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;
      return (
        <div>
          <p>
            Phase: <strong>{job.phase}</strong> — {job.done} / {job.total} ({percent}%) —{" "}
            {(elapsedMs / 1000).toFixed(1)}s
          </p>
          <progress value={job.done} max={job.total > 0 ? job.total : 1} />
        </div>
      );
    }

    case "ready":
      return (
        <div>
          <p>
            <strong>Import complete.</strong>
          </p>
          <table>
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
        <div>
          <p role="alert">
            <strong>{describeFailure(job.reason)}</strong>
          </p>
          <p>
            <code>{job.reason}</code>
          </p>
          <p>{job.detail}</p>
          {job.reason === "interrupted" ? (
            <button type="button" onClick={onWipe}>
              Clear archive
            </button>
          ) : (
            <button type="button" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      );
  }
}
