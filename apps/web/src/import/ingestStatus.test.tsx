// @vitest-environment jsdom
import { describeFailure, type IngestJob } from "@instavault/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IngestStatus } from "./IngestStatus.js";

function renderStatus(job: IngestJob, overrides: Partial<Parameters<typeof IngestStatus>[0]> = {}) {
  const onCancel = vi.fn();
  const onRetry = vi.fn();
  render(
    <IngestStatus
      job={job}
      elapsedMs={2100}
      onCancel={onCancel}
      onRetry={onRetry}
      {...overrides}
    />,
  );
  return { onCancel, onRetry };
}

afterEach(cleanup);

describe("IngestStatus", () => {
  it("renders a determinate bar when total > 0, with the phase in words", () => {
    renderStatus({ status: "parsing", phase: "storing", done: 4, total: 10 });

    expect(screen.getByText("Storing media")).toBeDefined();
    expect(screen.getByText("4 / 10")).toBeDefined();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("value")).toBe("4");
    expect(bar.getAttribute("max")).toBe("10");
  });

  it("renders an indeterminate bar when the total is not known yet", () => {
    renderStatus({ status: "parsing", phase: "reading", done: 0, total: 0 });

    expect(screen.getByText("Reading files")).toBeDefined();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("value")).toBeNull();
    expect(bar.getAttribute("max")).toBeNull();
  });

  it("cancels through the existing abort", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderStatus({ status: "parsing", phase: "reading", done: 0, total: 0 });

    await user.click(screen.getByRole("button", { name: "Cancel import" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows a human failure and Retry", () => {
    renderStatus({ status: "failed", reason: "cancelled", detail: "The import was cancelled." });

    expect(screen.getAllByText(describeFailure("cancelled")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
  });

  it("renders the shared summary on success", () => {
    renderStatus({
      status: "ready",
      summary: {
        categories: 5,
        entries: 20,
        mediaStored: 10,
        mediaMissing: 0,
        mediaOrphans: 0,
        unrecognised: [],
        fingerprint: "fmt-abcdef",
        durationMs: 1200,
      },
    });

    expect(screen.getByText("Import complete.")).toBeDefined();
    expect(screen.getByRole("rowheader", { name: "Categories" })).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
  });
});
