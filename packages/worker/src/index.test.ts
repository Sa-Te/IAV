import { describe, expect, it } from "vitest";

import { IngestWorkerHost, type IngestResponse } from "./index.js";

const sink = {
  readJob: async () => null,
  writeJob: async () => undefined,
  writeBatch: async () => undefined,
  commitArchive: async () => undefined,
  clear: async () => undefined,
  estimateFreeBytes: async () => null,
  storedCategoryIds: async () => [],
};

describe("IngestWorkerHost", () => {
  it("announces readiness so a client can hold requests until the worker listens", () => {
    const posted: IngestResponse[] = [];
    const host = new IngestWorkerHost(sink, (response) => posted.push(response));

    host.announceReady();

    expect(posted).toEqual([{ type: "ready" }]);
  });

  it("answers a thumbnail request without a media store instead of going silent", async () => {
    const posted: IngestResponse[] = [];
    const host = new IngestWorkerHost(sink, (response) => posted.push(response));

    await host.handle({ type: "thumbnail", path: "media/posts/a.jpg" });

    expect(posted).toEqual([
      { type: "thumbnail", path: "media/posts/a.jpg", thumbnail: null, reason: "unsupported" },
    ]);
  });
});
