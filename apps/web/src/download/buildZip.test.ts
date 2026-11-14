import type { ZipPlan } from "@instavault/core";
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { buildZip } from "./buildZip.js";

const FILES: Readonly<Record<string, string>> = {
  "posts/202402/a.webp": "first photo bytes",
  "posts/202402/b.webp": "second photo bytes",
  "stories/202103/y.mp4": "a story video",
  "stories/202103/z.mp4": "another story video",
  "profile/photo.jpg": "the profile photo",
};

function planOf(paths: readonly string[]): ZipPlan {
  return {
    entries: paths.map((archivePath) => ({
      archivePath,
      bytes: new TextEncoder().encode(FILES[archivePath] ?? "").byteLength,
    })),
    skipped: [],
    duplicates: 0,
    totalBytes: paths.reduce(
      (sum, path) => sum + new TextEncoder().encode(FILES[path] ?? "").byteLength,
      0,
    ),
  };
}

function blobOf(text: string): Blob {
  return new Blob([new TextEncoder().encode(text)]);
}

async function contents(blob: Blob): Promise<Record<string, Uint8Array>> {
  return unzipSync(new Uint8Array(await blob.arrayBuffer()));
}

describe("buildZip", () => {
  it("writes one entry per plan entry, with the archive paths intact", async () => {
    const paths = Object.keys(FILES);
    const result = await buildZip(planOf(paths), async (id) => blobOf(FILES[id] ?? ""));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const unzipped = await contents(result.blob);
    expect(Object.keys(unzipped).sort()).toEqual([...paths].sort());
    for (const path of paths) {
      expect(new TextDecoder().decode(unzipped[path])).toBe(FILES[path]);
    }
  });

  it("sums to the plan's total size: the blob carries every original byte", async () => {
    const paths = Object.keys(FILES);
    const plan = planOf(paths);
    const result = await buildZip(plan, async (id) => blobOf(FILES[id] ?? ""));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const unzipped = await contents(result.blob);
    const total = Object.values(unzipped).reduce((sum, bytes) => sum + bytes.byteLength, 0);
    expect(total).toBe(plan.totalBytes);
  });

  it("stores, never deflates: a compressible file keeps its full size", async () => {
    const zeros = new Blob([new Uint8Array(10_000)]);
    const plan: ZipPlan = {
      entries: [{ archivePath: "posts/zeros.bin", bytes: 10_000 }],
      skipped: [],
      duplicates: 0,
      totalBytes: 10_000,
    };
    const result = await buildZip(plan, async () => zeros);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // A deflated run of zeros is tens of bytes; a stored one is the file plus a
    // header. Anything under the file size would mean compression crept in.
    expect(result.blob.size).toBeGreaterThan(9_000);
  });

  it("reports progress once per entry, ending at the total", async () => {
    const paths = Object.keys(FILES);
    const seen: Array<[number, number]> = [];
    const result = await buildZip(
      planOf(paths),
      async (id) => blobOf(FILES[id] ?? ""),
      (done, total) => seen.push([done, total]),
    );

    expect(result.ok).toBe(true);
    expect(seen).toEqual(paths.map((_, index) => [index + 1, paths.length]));
  });

  it("fails with the path when a planned blob is no longer stored", async () => {
    const paths = Object.keys(FILES);
    const result = await buildZip(planOf(paths), async (id) =>
      id === "stories/202103/z.mp4" ? null : blobOf(FILES[id] ?? ""),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("stories/202103/z.mp4");
    expect(result.reason).toContain("no longer stored");
  });

  it("builds a valid, empty archive from an empty plan", async () => {
    const result = await buildZip(planOf([]), async () => null);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await contents(result.blob)).toEqual({});
  });
});
