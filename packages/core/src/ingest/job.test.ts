import { describe, expect, it } from "vitest";

import {
  IDLE,
  describeFailure,
  failed,
  isRunning,
  parsing,
  ready,
  recoverPersistedJob,
  type IngestFailureReason,
  type IngestJob,
} from "./job.js";

const SUMMARY = {
  categories: 2,
  entries: 10,
  mediaStored: 3,
  mediaMissing: 0,
  mediaOrphans: 0,
  unrecognised: [],
  fingerprint: "fmt-abcdef",
  durationMs: 12,
};

const REASONS: readonly IngestFailureReason[] = [
  "not-a-zip",
  "html-export",
  "insufficient-space",
  "corrupt-entry",
  "cancelled",
  "interrupted",
];

describe("IngestJob", () => {
  it("can express every status", () => {
    const jobs: readonly IngestJob[] = [
      IDLE,
      parsing("reading", 1, 10),
      ready(SUMMARY),
      failed("cancelled", "stopped"),
    ];
    expect(jobs.map((job) => job.status)).toEqual(["idle", "parsing", "ready", "failed"]);
  });

  it("cannot express parsing without totals", () => {
    // The type is the guarantee: a spinner with nothing behind it does not compile.
    const bad: IngestJob = {
      status: "parsing",
      phase: "reading",
      // @ts-expect-error — parsing requires done and total
      done: undefined,
      // @ts-expect-error — parsing requires done and total
      total: undefined,
    };
    expect(bad.status).toBe("parsing");
  });

  it("clamps negative progress instead of accepting it", () => {
    const job = parsing("storing", -5, -1);
    expect(job).toEqual({ status: "parsing", phase: "storing", done: 0, total: 0 });
  });

  it("knows what is still running", () => {
    expect(isRunning(parsing("reading", 0, 1))).toBe(true);
    expect(isRunning(IDLE)).toBe(false);
    expect(isRunning(ready(SUMMARY))).toBe(false);
  });

  it("has human wording for every failure reason", () => {
    for (const reason of REASONS) {
      expect(describeFailure(reason).length).toBeGreaterThan(10);
    }
  });

  it("names the re-request remedy for the HTML variant", () => {
    expect(describeFailure("html-export")).toContain("JSON");
  });
});

describe("recoverPersistedJob", () => {
  it("treats a persisted parsing job as interrupted", () => {
    const recovered = recoverPersistedJob(parsing("resolving", 7, 40));
    expect(recovered).toEqual({
      status: "failed",
      reason: "interrupted",
      detail: expect.stringContaining("resolving") as unknown as string,
    });
  });

  it("leaves a finished job alone", () => {
    expect(recoverPersistedJob(ready(SUMMARY))).toEqual(ready(SUMMARY));
    expect(recoverPersistedJob(failed("cancelled", "x")).status).toBe("failed");
  });

  it("treats nothing persisted as idle", () => {
    expect(recoverPersistedJob(null)).toEqual(IDLE);
    expect(recoverPersistedJob(undefined)).toEqual(IDLE);
  });

  it("never returns a running job", () => {
    for (const phase of ["reading", "resolving", "storing"] as const) {
      expect(isRunning(recoverPersistedJob(parsing(phase, 1, 2)))).toBe(false);
    }
  });
});
