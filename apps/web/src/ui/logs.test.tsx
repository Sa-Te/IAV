// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DevLogs } from "../routes/DevLogs.js";
import { clearLogs, installLogCapture, logEntries, LOG_CAPACITY, log } from "./logBuffer.js";

beforeEach(() => clearLogs());
afterEach(cleanup);

describe("log capture", () => {
  it("drops the oldest entry at capacity + 1", () => {
    for (let index = 0; index <= LOG_CAPACITY; index += 1) {
      log({ level: "warn", source: "console", message: `entry ${index}` });
    }

    expect(logEntries()).toHaveLength(LOG_CAPACITY);
    expect(logEntries()[0]?.message).toBe("entry 1");
    expect(logEntries().at(-1)?.message).toBe(`entry ${LOG_CAPACITY}`);
  });

  it("captures console.error, console.warn, window error and unhandled rejections", () => {
    const stop = installLogCapture();

    console.error("boom", 42);
    console.warn("careful");
    window.dispatchEvent(new ErrorEvent("error", { message: "window went wrong" }));

    const rejection = new Event("unhandledrejection") as Event & { reason?: unknown };
    rejection.reason = new Error("promise died");
    window.dispatchEvent(rejection);

    const entries = logEntries();
    expect(entries.map((entry) => `${entry.level}:${entry.source}`)).toEqual([
      "error:console",
      "warn:console",
      "error:window",
      "error:rejection",
    ]);
    expect(entries[0]?.message).toContain("boom 42");
    expect(entries[3]?.stack).toContain("promise died");

    stop();
  });

  it("restores the original console functions on uninstall", () => {
    const originalError = console.error;
    const originalWarn = console.warn;

    const stop = installLogCapture();
    expect(console.error).not.toBe(originalError);

    stop();

    expect(console.error).toBe(originalError);
    expect(console.warn).toBe(originalWarn);
  });

  it("still forwards to the real console, so nothing is swallowed", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const stop = installLogCapture();

    console.warn("kept");

    expect(spy).toHaveBeenCalledWith("kept");
    stop();
    spy.mockRestore();
  });
});

describe("DevLogs", () => {
  it("renders a readable line for a non-Error rejection reason", () => {
    const stop = installLogCapture();
    const rejection = new Event("unhandledrejection") as Event & { reason?: unknown };
    rejection.reason = { code: 7 };
    window.dispatchEvent(rejection);

    render(<DevLogs />);

    expect(screen.getByText(/\{"code":7\}/)).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain("1 of 1");

    stop();
  });
});
