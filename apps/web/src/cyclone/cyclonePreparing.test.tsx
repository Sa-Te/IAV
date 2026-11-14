// @vitest-environment jsdom
import type { MediaItemView } from "@instavault/core";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CycloneStage } from "./CycloneStage.js";
import type { CycloneHandle } from "./startCyclone.js";

const ITEMS: readonly MediaItemView[] = Array.from({ length: 8 }, (_, index) => ({
  id: `media/${index}.jpg`,
  caption: "",
  takenAt: 0,
  category: "posts",
}));

function handle(resident: number): CycloneHandle {
  return {
    stop: () => undefined,
    pointer: () => null,
    setPhase: () => undefined,
    setTilt: () => undefined,
    frame: () => undefined,
    stats: () => ({ resident, bytes: 0, drawCalls: resident }),
    renderer: "test",
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("cyclone preparing state", () => {
  it("shows the resident count, then swaps on the first drawn frame", () => {
    let frame: ((time: number) => void) | null = null;
    vi.stubGlobal("requestAnimationFrame", (callback: (time: number) => void) => {
      frame = callback;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => undefined);

    render(<CycloneStage items={ITEMS} reducedMotion={false} start={() => handle(1)} />);

    expect(screen.getByText("Preparing the 3D view — 0 of 8")).toBeDefined();
    expect(frame).not.toBeNull();

    act(() => {
      frame?.(16);
    });

    expect(screen.queryByText(/Preparing the 3D view/)).toBeNull();
  });

  it("adds the slower-graphics sentence after five seconds", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => undefined);

    render(<CycloneStage items={ITEMS} reducedMotion={false} start={() => handle(0)} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("This can take a moment on slower graphics.")).toBeDefined();
  });
});
