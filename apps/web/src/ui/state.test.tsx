// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { State, type StateKind } from "./State.js";

afterEach(cleanup);

const KINDS: readonly StateKind[] = ["loading", "empty", "error", "unavailable"];

function renderKind(kind: StateKind, onRetry?: () => void): string {
  cleanup();
  const { container } = render(
    onRetry === undefined ? <State kind={kind} /> : <State kind={kind} onRetry={onRetry} />,
  );
  return container.textContent ?? "";
}

describe("State", () => {
  it("gives the four kinds four different words", () => {
    const texts = KINDS.map((kind) => renderKind(kind));
    const headings = KINDS.map((kind) => {
      cleanup();
      render(<State kind={kind} />);
      return screen.getByText(
        {
          loading: "Loading",
          empty: "Nothing here",
          error: "Something went wrong",
          unavailable: "Not in this export",
        }[kind],
      ).textContent;
    });

    expect(new Set(texts).size).toBe(4);
    expect(new Set(headings).size).toBe(4);
  });

  it("marks each kind in the DOM so they cannot look the same by accident", () => {
    for (const kind of KINDS) {
      cleanup();
      const { container } = render(<State kind={kind} />);
      expect(container.querySelector(`.state-${kind}`)).not.toBeNull();
    }
  });

  it("announces loading politely and errors as an alert", () => {
    cleanup();
    render(<State kind="loading" />);
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");

    cleanup();
    render(<State kind="error" />);
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("offers a real, focusable retry button only when retrying is possible", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<State kind="error" message="Disk went away." onRetry={onRetry} />);

    const button = screen.getByRole("button", { name: "Try again" });
    button.focus();
    expect(document.activeElement).toBe(button);

    await user.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not show a retry control for a state that cannot be retried", () => {
    render(<State kind="unavailable" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the caller's words for the body, including the reason on an error", () => {
    render(
      <State kind="error" message="This category could not be read." detail="Quota exceeded." />,
    );

    expect(screen.getByText("This category could not be read.")).toBeDefined();
    expect(screen.getByText("Quota exceeded.")).toBeDefined();
  });
});
