import type { ZipPlan } from "@instavault/core";
import type { JSX } from "react";

import { formatBytes } from "../media/format.js";
import { isIos, ZIP_MEMORY_WARNING_BYTES } from "./limits.js";

/**
 * The pre-flight, before a single byte is read.
 *
 * Everything the download is about to do is stated here: how many files, how
 * large, what will be left out and why, and the two limits that are the browser's
 * rather than ours. Nothing is blocked — the reader decides. During the build the
 * panel becomes the progress bar; on failure it keeps the reason and the selection
 * is still there to retry.
 */
export function DownloadPanel({
  plan,
  building,
  progress,
  error,
  userAgent,
  onConfirm,
  onClose,
}: {
  plan: ZipPlan;
  building: boolean;
  progress: { readonly done: number; readonly total: number } | null;
  error: string | null;
  userAgent: string;
  onConfirm: () => void;
  onClose: () => void;
}): JSX.Element {
  const noBlob = plan.skipped.filter((skip) => skip.reason === "no-blob").length;
  const unsafe = plan.skipped.length - noBlob;
  const files = plan.entries.length;

  return (
    <section className="download-panel" aria-labelledby="download-heading">
      <h2 id="download-heading">
        Download {files} {files === 1 ? "file" : "files"}
      </h2>

      <p>
        Originals only, at original quality: {formatBytes(plan.totalBytes)} at their archive paths.
        Nothing is uploaded.
      </p>

      {plan.skipped.length > 0 && (
        <p className="download-note">
          {files === 0
            ? "Nothing can be included: "
            : `${plan.skipped.length} selected ${plan.skipped.length === 1 ? "item is" : "items are"} left out: `}
          {noBlob > 0 && `${noBlob} with no stored file`}
          {noBlob > 0 && unsafe > 0 && ", "}
          {unsafe > 0 && `${unsafe} with an unsafe archive path`}.
        </p>
      )}

      {plan.totalBytes > ZIP_MEMORY_WARNING_BYTES && (
        <p className="download-note">
          This ZIP is built in memory ({formatBytes(plan.totalBytes)}). On a device with little free
          memory the build may fail; narrow the selection or continue.
        </p>
      )}

      {isIos(userAgent) && (
        <p className="download-note">
          iOS Safari may not save a ZIP this large through a download link. If nothing happens, use
          a desktop browser.
        </p>
      )}

      {building && progress !== null ? (
        <div className="download-progress" aria-live="polite">
          <p>
            Adding {progress.done} of {progress.total} files
          </p>
          <progress value={progress.done} max={progress.total} aria-label="Building the ZIP" />
        </div>
      ) : (
        <div className="selection-actions">
          <button type="button" className="button" onClick={onConfirm} disabled={files === 0}>
            Download ZIP
          </button>
          <button type="button" className="button button-quiet" onClick={onClose}>
            Cancel
          </button>
        </div>
      )}

      {error !== null && (
        <p className="download-error" role="alert">
          {error} Your selection is still here, so you can try again.
        </p>
      )}
    </section>
  );
}
