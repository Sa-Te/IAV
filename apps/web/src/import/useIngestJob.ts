import type { IngestJob } from "@instavault/core";
import { useCallback, useEffect, useRef, useState } from "react";

import { useListCache } from "../data/ListCacheContext.js";

/**
 * One ingest session in the tab: the worker, its job, elapsed time and the four
 * actions the UI needs. The worker protocol is unchanged from the dev harness.
 *
 * The worker is created once per mount. `recover` asks it for a persisted job, so
 * a reload after an interrupted import shows `interrupted`, not a spinner.
 */

export interface IngestSession {
  readonly job: IngestJob;
  readonly elapsedMs: number;
  readonly protocolError: string | null;
  readonly start: (file: File) => Promise<void>;
  readonly cancel: () => void;
  readonly retry: () => void;
  readonly clear: () => void;
}

export function useIngestJob(): IngestSession {
  const listCache = useListCache();
  const workerRef = useRef<Worker | null>(null);
  const lastFileRef = useRef<File | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [job, setJob] = useState<IngestJob>({ status: "idle" });
  const [protocolError, setProtocolError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    // Vite only rewrites this when the URL expression is inline.
    const worker = new Worker(new URL("../workers/ingest.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as { type: string; job?: IngestJob; message?: string };
      if (data.type === "job" && data.job !== undefined) {
        setJob(data.job);
        if (data.job.status !== "parsing") startedAtRef.current = null;
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

  const start = useCallback(async (file: File) => {
    lastFileRef.current = file;
    setProtocolError(null);
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setJob({ status: "parsing", phase: "reading", done: 0, total: 0 });
    const zip = await file.arrayBuffer();
    workerRef.current?.postMessage({ type: "ingest", zip }, [zip]);
  }, []);

  const cancel = useCallback(() => {
    workerRef.current?.postMessage({ type: "cancel" });
  }, []);

  const retry = useCallback(() => {
    const file = lastFileRef.current;
    if (file !== null) void start(file);
  }, [start]);

  const clear = useCallback(() => {
    workerRef.current?.postMessage({ type: "clear" });
    listCache?.clear();
    setProtocolError(null);
  }, [listCache]);

  return { job, elapsedMs, protocolError, start, cancel, retry, clear };
}
