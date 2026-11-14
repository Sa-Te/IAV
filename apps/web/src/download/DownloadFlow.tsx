import { useState, type JSX } from "react";

import { buildZip } from "./buildZip.js";
import { DownloadPanel } from "./DownloadPanel.js";
import { saveBlob, zipFilename } from "./saveBlob.js";
import type { ZipPlan } from "@instavault/core";

/** Only the one read the build needs, so a caller can pass a repository or a fake. */
export interface BlobSource {
  getMediaBlob(id: string): Promise<Blob | null>;
}

/**
 * Owns the download's own state, so a progress update re-renders the panel and not
 * the gallery. With 391 files and 419 tiles, updating progress in the gallery
 * re-rendered every tile 391 times: 14 s and 50–117 ms main-thread tasks for work
 * that should be a few seconds.
 *
 * Updates are also throttled to one per 100 ms: the bar has to move, not to report
 * every file. The final value is always delivered.
 */
export const PROGRESS_PAINT_MS = 100;

export function DownloadFlow({
  plan,
  source,
  onClose,
  onDone,
  onBusyChange,
}: {
  plan: ZipPlan;
  source: BlobSource;
  onClose: () => void;
  /** Success: the caller clears the selection and leaves selection mode. */
  onDone: () => void;
  onBusyChange?: (busy: boolean) => void;
}): JSX.Element {
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (): Promise<void> => {
    if (building || plan.entries.length === 0) return;
    setBuilding(true);
    onBusyChange?.(true);
    setError(null);
    setProgress({ done: 0, total: plan.entries.length });

    let lastPaint = 0;
    const result = await buildZip(
      plan,
      (id) => source.getMediaBlob(id),
      (done, total) => {
        const now = Date.now();
        if (done < total && now - lastPaint < PROGRESS_PAINT_MS) return;
        lastPaint = now;
        setProgress({ done, total });
      },
    );

    setBuilding(false);
    onBusyChange?.(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    saveBlob(result.blob, zipFilename());
    setProgress(null);
    onDone();
  };

  return (
    <DownloadPanel
      plan={plan}
      building={building}
      progress={progress}
      error={error}
      userAgent={navigator.userAgent}
      onConfirm={() => void start()}
      onClose={onClose}
    />
  );
}
