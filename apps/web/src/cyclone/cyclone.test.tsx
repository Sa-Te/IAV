// @vitest-environment jsdom
import { IDLE_VELOCITY, MAX_SPIN, TILT_LIMIT, type CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CyclonePage } from "./CyclonePage.js";
import { startCyclone } from "./startCyclone.js";

vi.mock("./startCyclone.js", () => ({ startCyclone: vi.fn() }));

const startMock = vi.mocked(startCyclone);

function handle() {
  return {
    stop: vi.fn(),
    pointer: () => null,
    setPhase: vi.fn(),
    setTilt: vi.fn(),
    frame: vi.fn(),
    stats: () => ({ resident: 0, bytes: 0, drawCalls: 0 }),
    renderer: "test",
  };
}

function record(count: number): CategoryRecord {
  return {
    id: "posts",
    resolvedTier: 1,
    entryCount: count,
    data: Array.from({ length: count }, (_, index) => ({
      media: [
        { uri: `media/posts/${index}.jpg`, title: `post ${index}`, creation_timestamp: index },
      ],
    })),
    sources: [{ path: "posts_1.json", entryCount: count, kind: "array" }],
    warnings: [],
  };
}

function repository(count: number): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [record(count)],
    getMediaBlob: async () => null,
    getCategory: async () => null,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

function renderPage(count = 12): void {
  render(
    <MemoryRouter>
      <RepositoryProvider repository={repository(count)}>
        <CyclonePage />
      </RepositoryProvider>
    </MemoryRouter>,
  );
}

function reduceMotion(on: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: on && query.includes("reduced-motion"),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  startMock.mockReset();
  startMock.mockReturnValue(handle());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("cyclone fallbacks", () => {
  it("renders the grid and says why when WebGL2 is unavailable", async () => {
    startMock.mockReturnValue(null);
    renderPage();

    expect(await screen.findByText(/needs WebGL2/)).toBeDefined();
    // The grid is real, not a dead canvas.
    expect(screen.getAllByRole("button", { name: /Open|post/ }).length).toBeGreaterThan(0);
  });

  it("renders the grid when there are fewer than eight items", async () => {
    renderPage(3);

    expect(await screen.findByText(/needs at least 8 media items/)).toBeDefined();
    expect(startMock).not.toHaveBeenCalled();
  });

  it("does not start the motion loop under reduced motion until asked", async () => {
    const user = userEvent.setup();
    reduceMotion(true);
    renderPage();

    await screen.findByRole("button", { name: "Start motion" });
    expect(startMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Start motion" }));
    expect(startMock).toHaveBeenCalledTimes(1);
  });
});

describe("cyclone accessibility", () => {
  it("exposes the same number of items as buttons in the hidden list", async () => {
    renderPage(12);
    const list = await screen.findByRole("list", { name: "All media, in cyclone order" });

    expect(within(list).getAllByRole("button")).toHaveLength(12);
  });

  it("never makes the canvas a tab stop", async () => {
    const { container } = render(
      <MemoryRouter>
        <RepositoryProvider repository={repository(12)}>
          <CyclonePage />
        </RepositoryProvider>
      </MemoryRouter>,
    );
    await screen.findByRole("list", { name: "All media, in cyclone order" });
    const canvas = container.querySelector("canvas");

    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
    expect(canvas?.getAttribute("tabindex")).toBeNull();
  });
});

describe("cyclone keyboard", () => {
  it("moves the highlight by exactly one on ArrowDown", async () => {
    const user = userEvent.setup();
    renderPage(12);
    const list = await screen.findByRole("list", { name: "All media, in cyclone order" });
    const buttons = within(list).getAllByRole("button");

    expect(buttons[0]?.getAttribute("aria-current")).toBe("true");

    buttons[0]?.focus();
    await user.keyboard("{ArrowDown}");

    expect(buttons[1]?.getAttribute("aria-current")).toBe("true");
    expect(buttons[0]?.getAttribute("aria-current")).toBe("false");
  });

  it("opens the detail for the highlighted item on Enter", async () => {
    const user = userEvent.setup();
    renderPage(12);
    const list = await screen.findByRole("list", { name: "All media, in cyclone order" });
    const buttons = within(list).getAllByRole("button");

    buttons[2]?.focus();
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("post 2");
  });
});

describe("cyclone keys stay inside the region", () => {
  it("prevents the default (page scroll) and moves the highlight by one", async () => {
    const user = userEvent.setup();
    renderPage(12);
    const list = await screen.findByRole("list", { name: "All media, in cyclone order" });
    const buttons = within(list).getAllByRole("button");
    const region = list.closest(".cyclone");
    expect(region).not.toBeNull();

    buttons[0]?.focus();
    // fireEvent returns false when the handler called preventDefault.
    const dispatched = fireEvent.keyDown(region as Element, { key: "ArrowDown" });

    expect(dispatched).toBe(false);
    expect(buttons[1]?.getAttribute("aria-current")).toBe("true");
    expect(buttons[0]?.getAttribute("aria-current")).toBe("false");
    expect(user).toBeDefined();
  });

  it("does not consume keys typed outside the region", async () => {
    renderPage(12);
    await screen.findByRole("list", { name: "All media, in cyclone order" });

    const dispatched = fireEvent.keyDown(document.body, { key: "ArrowDown" });

    expect(dispatched).toBe(true);
  });

  it("consumes Space so the page cannot scroll, and leaves Escape alone", async () => {
    renderPage(12);
    const list = await screen.findByRole("list", { name: "All media, in cyclone order" });
    const region = list.closest(".cyclone");

    expect(fireEvent.keyDown(region as Element, { key: " " })).toBe(false);
    const escape = fireEvent.keyDown(region as Element, { key: "Escape" });
    // Escape is not ours to consume: consuming it would block the browser's own
    // "stop" behaviour and, in a router, can read as a navigation.
    expect(escape).toBe(true);
  });
});

describe("the texture budget is a refusal, not a crash", () => {
  it("falls back to the grid with a sentence when the budget is exceeded", async () => {
    const { TextureBudgetError } = await import("./gl/textures.js");
    startMock.mockImplementation(() => {
      throw new TextureBudgetError(97, 96);
    });
    renderPage();

    expect(await screen.findByText(/needs more cards than this device can hold/)).toBeDefined();
  });

  it("catches any other startup error, logs it, and still degrades to the grid", async () => {
    const { clearLogs, logEntries } = await import("../ui/logBuffer.js");
    clearLogs();
    startMock.mockImplementation(() => {
      throw new Error("shader failed to compile");
    });
    renderPage();

    expect(await screen.findByText(/cannot start the 3D view/)).toBeDefined();
    expect(logEntries().some((entry) => entry.message.includes("shader failed to compile"))).toBe(
      true,
    );
  });
});

/**
 * Pointer tilt, wheel and drag. The arithmetic is core's; these tests only prove
 * the stage decides an event is real, hands it over, and lets the frame carry the
 * result — plus that reduced motion wins over all three.
 */
function stubFrames(): (now: number) => void {
  const pending: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    pending.push(callback),
  );
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  return (now: number) => {
    for (const callback of pending.splice(0)) callback(now);
  };
}

function sizedCanvas(container: HTMLElement, width = 800, height = 600): HTMLCanvasElement {
  const canvas = container.querySelector("canvas");
  if (canvas === null) throw new Error("no canvas");
  canvas.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0 }) as DOMRect;
  return canvas;
}

function phases(instance: ReturnType<typeof handle>): number[] {
  return instance.setPhase.mock.calls.map(([value]) => value as number);
}

describe("cyclone interactions", () => {
  it("moves the phase on a wheel, bounded, and stops the page scrolling", async () => {
    const frames = stubFrames();
    const instance = handle();
    startMock.mockReturnValue(instance);
    const { container } = render(
      <MemoryRouter>
        <RepositoryProvider repository={repository(12)}>
          <CyclonePage />
        </RepositoryProvider>
      </MemoryRouter>,
    );
    await screen.findByRole("list", { name: "All media, in cyclone order" });
    const canvas = sizedCanvas(container);

    // fireEvent returns false when the handler called preventDefault.
    expect(fireEvent.wheel(canvas, { deltaY: 1000 })).toBe(false);

    let now = performance.now();
    for (let frame = 0; frame < 5; frame += 1) frames((now += 16));
    const forward = phases(instance).at(-1) ?? 0;
    expect(forward).toBeGreaterThan(0);
    // A hard flick cannot outrun idle plus the spin ceiling.
    expect(forward).toBeLessThan((IDLE_VELOCITY + MAX_SPIN) * 5 * 16 + 0.01);

    expect(fireEvent.wheel(canvas, { deltaY: -1000 })).toBe(false);
    for (let frame = 0; frame < 5; frame += 1) frames((now += 16));
    const backward = phases(instance).at(-1) ?? 0;
    expect(backward).toBeLessThan(forward);
  });

  it("leans by the pointer, clamped at its limit", async () => {
    const frames = stubFrames();
    const instance = handle();
    startMock.mockReturnValue(instance);
    const { container } = render(
      <MemoryRouter>
        <RepositoryProvider repository={repository(12)}>
          <CyclonePage />
        </RepositoryProvider>
      </MemoryRouter>,
    );
    await screen.findByRole("list", { name: "All media, in cyclone order" });
    const canvas = sizedCanvas(container);

    // Far above and to the right of the canvas: the pointer cannot over-lean it.
    fireEvent.pointerMove(canvas, { clientX: 5000, clientY: -5000 });
    let now = performance.now();
    for (let frame = 0; frame < 40; frame += 1) frames((now += 16));

    const tilt = instance.setTilt.mock.calls.at(-1)?.[0] as { yaw: number; pitch: number };
    expect(tilt.yaw).toBeLessThanOrEqual(TILT_LIMIT);
    expect(tilt.pitch).toBeGreaterThanOrEqual(-TILT_LIMIT);
    // Eased toward the clamped target (the ease is time-based, so how far it gets
    // in 40 frames depends on the clock; direction and the clamp are the contract).
    expect(tilt.yaw).toBeGreaterThan(0);
    expect(tilt.pitch).toBeLessThan(0);
  });

  it("carries a drag's velocity after release and decays it within three seconds", async () => {
    const frames = stubFrames();
    const instance = handle();
    startMock.mockReturnValue(instance);
    const { container } = render(
      <MemoryRouter>
        <RepositoryProvider repository={repository(12)}>
          <CyclonePage />
        </RepositoryProvider>
      </MemoryRouter>,
    );
    await screen.findByRole("list", { name: "All media, in cyclone order" });
    const canvas = sizedCanvas(container);

    fireEvent.pointerDown(canvas, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientY: 400, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientY: 400, pointerId: 1 });

    let now = performance.now();
    for (let frame = 0; frame < 200; frame += 1) frames((now += 16));

    const recorded = phases(instance);
    // Compare windows, not single frames: one frame's dt depends on where the
    // browser's clock happened to be, which made this test flaky.
    const advance = (from: number, to: number): number =>
      (recorded[to] ?? 0) - (recorded[from] ?? 0);
    const firstFive = advance(1, 6);
    const lastFive = advance(recorded.length - 6, recorded.length - 1);

    // The flick moved it faster than idle at first, and is back to a crawl by 3 s.
    expect(firstFive).toBeGreaterThan(IDLE_VELOCITY * 16 * 5);
    expect(Math.abs(lastFive)).toBeLessThan(Math.abs(firstFive) / 5);
  });

  it("ignores wheel, drag and tilt under reduced motion, even with motion opted in", async () => {
    const frames = stubFrames();
    const instance = handle();
    startMock.mockReturnValue(instance);
    reduceMotion(true);
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <RepositoryProvider repository={repository(12)}>
          <CyclonePage />
        </RepositoryProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "Start motion" }));
    const canvas = sizedCanvas(container);

    fireEvent.wheel(canvas, { deltaY: 4000 });
    fireEvent.pointerMove(canvas, { clientX: 5000, clientY: -5000 });
    fireEvent.pointerDown(canvas, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientY: 200, pointerId: 1 });

    let now = performance.now();
    for (let frame = 0; frame < 30; frame += 1) frames((now += 16));

    expect(instance.setPhase.mock.calls.length).toBeGreaterThan(0);
    expect(phases(instance).every((value) => value === 0)).toBe(true);
    for (const [tilt] of instance.setTilt.mock.calls) {
      expect(tilt).toEqual({ yaw: 0, pitch: 0 });
    }
  });
});
