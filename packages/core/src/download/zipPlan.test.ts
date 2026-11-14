import { describe, expect, it } from "vitest";

import { buildZipPlan, isSafeArchivePath, type MediaRecordSize } from "./zipPlan.js";

function record(id: string, bytes: number, hasBlob = true): MediaRecordSize {
  return { id, bytes, hasBlob };
}

const POSTS: readonly MediaRecordSize[] = [
  record("posts/202402/a.webp", 1000),
  record("posts/202402/b.webp", 2000),
  record("posts/202403/c.webp", 3000),
  record("stories/202103/y.mp4", 4000),
  record("stories/202103/z.mp4", 5000),
];

describe("buildZipPlan", () => {
  it("turns a selection of five into five entries with their paths intact", () => {
    const ids = POSTS.map((entry) => entry.id);
    const plan = buildZipPlan(ids, POSTS);

    expect(plan.entries.map((entry) => entry.archivePath)).toEqual(ids);
    expect(plan.skipped).toEqual([]);
    expect(plan.duplicates).toBe(0);
    expect(plan.totalBytes).toBe(15000);
  });

  it("writes a duplicated path once and counts it", () => {
    const ids = [...POSTS.slice(0, 4).map((entry) => entry.id), "posts/202402/a.webp"];
    const plan = buildZipPlan(ids, POSTS);

    expect(plan.entries).toHaveLength(4);
    expect(plan.duplicates).toBe(1);
    expect(plan.totalBytes).toBe(10000);
  });

  it("refuses a traversal path and reports it", () => {
    const plan = buildZipPlan(["../../etc/passwd"], [record("../../etc/passwd", 10)]);

    expect(plan.entries).toEqual([]);
    expect(plan.skipped).toEqual([{ id: "../../etc/passwd", reason: "unsafe-path" }]);
    expect(plan.totalBytes).toBe(0);
  });

  it("refuses an absolute path, a backslash and a control character", () => {
    const ids = ["/etc/passwd", "C:/Windows/system.ini", "posts\\a.jpg", "posts/a\u0000b.jpg"];
    const plan = buildZipPlan(
      ids,
      ids.map((id) => record(id, 1)),
    );

    expect(plan.entries).toEqual([]);
    expect(plan.skipped.map((skip) => skip.reason)).toEqual([
      "unsafe-path",
      "unsafe-path",
      "unsafe-path",
      "unsafe-path",
    ]);
  });

  it("skips a selected item the media store has no blob for", () => {
    const plan = buildZipPlan(["posts/202402/a.webp", "posts/missing.jpg"], POSTS);

    expect(plan.entries.map((entry) => entry.archivePath)).toEqual(["posts/202402/a.webp"]);
    expect(plan.skipped).toEqual([{ id: "posts/missing.jpg", reason: "no-blob" }]);
  });

  it("skips a record that exists but has no blob", () => {
    const plan = buildZipPlan(["posts/empty.jpg"], [record("posts/empty.jpg", 0, false)]);

    expect(plan.entries).toEqual([]);
    expect(plan.skipped).toEqual([{ id: "posts/empty.jpg", reason: "no-blob" }]);
  });

  it("totalBytes is the sum of the surviving entries only", () => {
    const plan = buildZipPlan(["/abs.jpg", "posts/202402/b.webp", "missing.jpg"], POSTS);

    expect(plan.totalBytes).toBe(2000);
    expect(plan.totalBytes).toBe(plan.entries.reduce((sum, entry) => sum + entry.bytes, 0));
  });

  it("keeps selection order", () => {
    const plan = buildZipPlan(["stories/202103/z.mp4", "posts/202402/a.webp"], POSTS);

    expect(plan.entries.map((entry) => entry.archivePath)).toEqual([
      "stories/202103/z.mp4",
      "posts/202402/a.webp",
    ]);
  });

  it("is empty for an empty selection", () => {
    expect(buildZipPlan([], POSTS)).toEqual({
      entries: [],
      skipped: [],
      duplicates: 0,
      totalBytes: 0,
    });
  });
});

describe("isSafeArchivePath", () => {
  it("accepts the measured archive shapes", () => {
    expect(isSafeArchivePath("media/posts/202402/photo.webp")).toBe(true);
    expect(isSafeArchivePath("your_instagram_activity/messages/inbox/t_abc/photos/a.jpg")).toBe(
      true,
    );
    expect(isSafeArchivePath("a..b/c.jpg")).toBe(true);
  });

  it("refuses the four unsafe shapes", () => {
    expect(isSafeArchivePath("")).toBe(false);
    expect(isSafeArchivePath("/etc/passwd")).toBe(false);
    expect(isSafeArchivePath("media/../../etc/passwd")).toBe(false);
    expect(isSafeArchivePath("media\\posts\\a.jpg")).toBe(false);
    expect(isSafeArchivePath("media/posts/a\nb.jpg")).toBe(false);
    expect(isSafeArchivePath("D:photos/a.jpg")).toBe(false);
  });
});
