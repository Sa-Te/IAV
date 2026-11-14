// @vitest-environment jsdom
import { describeFailure, type ArchiveRow } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ImportPage } from "./ImportPage.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message: { type: string }): void {
    if (message.type === "ingest") {
      this.onmessage?.({
        data: {
          type: "job",
          job: { status: "parsing", phase: "storing", done: 4, total: 10 },
        },
      } as MessageEvent);
    }
    if (message.type === "cancel") {
      this.onmessage?.({
        data: {
          type: "job",
          job: { status: "failed", reason: "cancelled", detail: "The import was cancelled." },
        },
      } as MessageEvent);
    }
  }

  terminate(): void {}
}

function repository(): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [],
    getMediaBlob: async () => null,
    getCategory: async () => null,
    summary: async () => null as ArchiveRow | null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

beforeEach(() => {
  FakeWorker.instances = [];
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("import progress", () => {
  it("shows a determinate bar, then cancel lands on failed:cancelled", async () => {
    const user = userEvent.setup();
    render(
      <RepositoryProvider repository={repository()}>
        <ImportPage />
      </RepositoryProvider>,
    );

    const input = await screen.findByLabelText(/Drop your ZIP here/);
    await user.upload(input, new File(["zip"], "export.zip", { type: "application/zip" }));

    expect(await screen.findByText("Storing media")).toBeDefined();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("value")).toBe("4");
    expect(bar.getAttribute("max")).toBe("10");

    await user.click(screen.getByRole("button", { name: "Cancel import" }));
    expect((await screen.findAllByText(describeFailure("cancelled"))).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
  });

  it("shows an indeterminate bar before the total is known", () => {
    class CountingWorker extends FakeWorker {
      override postMessage(message: { type: string }): void {
        if (message.type === "ingest") {
          this.onmessage?.({
            data: { type: "job", job: { status: "parsing", phase: "reading", done: 0, total: 0 } },
          } as MessageEvent);
        }
      }
    }
    vi.stubGlobal("Worker", CountingWorker);
    render(
      <RepositoryProvider repository={repository()}>
        <ImportPage />
      </RepositoryProvider>,
    );

    return screen.findByLabelText(/Drop your ZIP here/).then(async (input) => {
      fireEvent.change(input, {
        target: { files: [new File(["zip"], "export.zip", { type: "application/zip" })] },
      });
      const bar = await screen.findByRole("progressbar");
      expect(bar.getAttribute("value")).toBeNull();
    });
  });
});
