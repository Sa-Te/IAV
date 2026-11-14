import type { ZipPlan } from "@instavault/core";
import { Zip, ZipPassThrough } from "fflate";

/**
 * A ZIP of originals, built in memory with fflate's streaming writer.
 *
 * `zipSync` is deliberately not used: it needs every file in memory at once as a
 * nested object and deflates the whole archive. The media is already compressed
 * (JPEG, HEIC, WebP, MP4), so DEFLATE would cost seconds and save nothing —
 * every entry is STORE (pass-through). The writer emits chunks as they are added,
 * and this module yields to the event loop between entries when a frame's worth of
 * time has passed, so the progress bar paints during a 133 MB build.
 */

export type BuildZipResult =
  { readonly ok: true; readonly blob: Blob } | { readonly ok: false; readonly reason: string };

export type GetBlob = (id: string) => Promise<Blob | null>;
export type ZipProgress = (done: number, total: number) => void;

/** One frame at 60 Hz: enough for the bar to paint, not one timer per file. */
export const YIELD_INTERVAL_MS = 16;

async function yieldToUi(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export async function buildZip(
  plan: ZipPlan,
  getBlob: GetBlob,
  onProgress?: ZipProgress,
): Promise<BuildZipResult> {
  const chunks: Uint8Array[] = [];
  let failed: string | null = null;

  const zip = new Zip((error, chunk) => {
    if (error !== null) {
      failed ??= error.message;
      return;
    }
    if (chunk.length > 0) chunks.push(chunk);
  });

  const total = plan.entries.length;
  let done = 0;
  let lastYield = Date.now();

  for (const entry of plan.entries) {
    const blob = await getBlob(entry.archivePath);
    if (blob === null) {
      // The plan said this path was stored; it is not any more. Writing a ZIP
      // with a hole would be a silent partial download.
      return {
        ok: false,
        reason: `“${entry.archivePath}” is no longer stored, so nothing was downloaded.`,
      };
    }

    const stream = new ZipPassThrough(entry.archivePath);
    zip.add(stream);
    stream.push(new Uint8Array(await blob.arrayBuffer()), true);
    done += 1;
    onProgress?.(done, total);
    if (failed !== null) break;

    if (Date.now() - lastYield >= YIELD_INTERVAL_MS) {
      await yieldToUi();
      lastYield = Date.now();
    }
  }

  if (failed !== null) return { ok: false, reason: failed };

  zip.end();
  if (failed !== null) return { ok: false, reason: failed };

  // fflate writes each chunk into a fresh ArrayBuffer; its declaration predates
  // TypeScript 5.9's generic `Uint8Array`. The cast states what the runtime already
  // guarantees and avoids copying 133 MB to satisfy the type.
  return {
    ok: true,
    blob: new Blob(chunks as Uint8Array<ArrayBuffer>[], { type: "application/zip" }),
  };
}
