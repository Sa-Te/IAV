// @vitest-environment jsdom
import {
  type EventDay,
  type EventEntry,
  type EventListView as EventListViewData,
  type EventMonth,
} from "@instavault/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { EventListView } from "./EventListView.js";

afterEach(cleanup);

const at = (iso: string): number => Math.floor(new Date(iso).getTime() / 1000);

function entry(ordinal: number, timestamp: number | null, hero: string | null = null): EventEntry {
  return {
    ordinal,
    timestamp,
    date: timestamp === null ? null : `date ${ordinal}`,
    hero: hero === null ? null : { label: "Caption", text: hero },
    url: null,
    shortcode: null,
    fields: [],
  };
}

function day(key: string, label: string, entries: readonly EventEntry[]): EventDay {
  return { key, label, entries };
}

function month(key: string, label: string, days: readonly EventDay[]): EventMonth {
  return {
    key,
    label,
    days,
    entryCount: days.reduce((sum, value) => sum + value.entries.length, 0),
  };
}

function view(
  months: readonly EventMonth[],
  undated: readonly EventEntry[] = [],
): EventListViewData {
  const total = months.reduce((sum, value) => sum + value.entryCount, 0) + undated.length;
  return {
    kind: "event-list",
    months,
    undated,
    total,
    hasTimestamps: months.length > 0,
  };
}

describe("event list — months", () => {
  it("opens the newest month and leaves the older ones closed", () => {
    const data = view([
      month("2026-11", "November 2026", [
        day("2026-11-15", "15 November 2026", [entry(1, at("2026-11-15T12:00:00Z"), "newest")]),
      ]),
      month("2026-10", "October 2026", [
        day("2026-10-15", "15 October 2026", [entry(2, at("2026-10-15T12:00:00Z"), "older")]),
      ]),
    ]);
    render(<EventListView view={data} raw={[]} />);

    const buttons = screen.getAllByRole("button", { name: /2026/ });
    expect(buttons[0]?.getAttribute("aria-expanded")).toBe("true");
    expect(buttons[1]?.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("newest")).toBeDefined();
    expect(screen.queryByText("older")).toBeNull();
  });

  it("toggles a month with aria-expanded and renders its days only when open", async () => {
    const user = userEvent.setup();
    const data = view([
      month("2026-11", "November 2026", [
        day("2026-11-15", "15 November 2026", [entry(1, at("2026-11-15T12:00:00Z"), "newest")]),
      ]),
      month("2026-10", "October 2026", [
        day("2026-10-15", "15 October 2026", [entry(2, at("2026-10-15T12:00:00Z"), "older")]),
      ]),
    ]);
    render(<EventListView view={data} raw={[]} />);

    const older = screen.getByRole("button", { name: /October 2026/ });
    await user.click(older);
    expect(older.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("older")).toBeDefined();
    expect(screen.getByRole("heading", { level: 3, name: "15 October 2026" })).toBeDefined();

    await user.click(older);
    expect(older.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("older")).toBeNull();
  });
});

describe("event list — day pagination", () => {
  it("shows 200 rows, then adds the remaining 50", async () => {
    const user = userEvent.setup();
    const entries = Array.from({ length: 250 }, (_, index) =>
      entry(index + 1, at("2026-11-15T12:00:00Z"), `row ${index + 1}`),
    );
    const data = view([
      month("2026-11", "November 2026", [day("2026-11-15", "15 November 2026", entries)]),
    ]);
    render(<EventListView view={data} raw={[]} />);

    expect(document.querySelectorAll(".event-row")).toHaveLength(200);
    expect(screen.getByText("Showing 200 of 250 entries.")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Show 50 more" }));
    expect(document.querySelectorAll(".event-row")).toHaveLength(250);
    expect(screen.queryByText(/Showing 200 of 250/)).toBeNull();
  });

  it("shows seven days at a time, then adds the eighth", async () => {
    const user = userEvent.setup();
    const days = Array.from({ length: 8 }, (_, index) =>
      day(`2026-11-${String(index + 1).padStart(2, "0")}`, `${index + 1} November 2026`, [
        entry(index + 1, at("2026-11-01T12:00:00Z"), `day ${index + 1}`),
      ]),
    );
    const data = view([month("2026-11", "November 2026", days)]);
    render(<EventListView view={data} raw={[]} />);

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(7);
    await user.click(screen.getByRole("button", { name: "Show 1 more day" }));
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(8);
  });

  it("paginates an undated list at 200", async () => {
    const user = userEvent.setup();
    const entries = Array.from({ length: 250 }, (_, index) =>
      entry(index + 1, null, `undated ${index + 1}`),
    );
    const data: EventListViewData = {
      kind: "event-list",
      months: [],
      undated: entries,
      total: entries.length,
      hasTimestamps: false,
    };
    render(<EventListView view={data} raw={[]} />);

    expect(document.querySelectorAll(".event-row")).toHaveLength(200);
    await user.click(screen.getByRole("button", { name: "Show 50 more" }));
    expect(document.querySelectorAll(".event-row")).toHaveLength(250);
  });
});

describe("event list — rows", () => {
  it("renders the shortcode in mono with the URL as the accessible link", () => {
    const url = "https://www.instagram.com/p/De1mMaNF7pZ/";
    const row: EventEntry = {
      ...entry(1, at("2026-11-15T12:00:00Z"), "a caption"),
      url,
      shortcode: "De1mMaNF7pZ",
    };
    render(
      <EventListView
        view={view([
          month("2026-11", "November 2026", [day("2026-11-15", "15 November 2026", [row])]),
        ])}
        raw={[]}
      />,
    );

    const link = screen.getByRole("link", { name: url });
    expect(link.getAttribute("href")).toBe(url);
    expect(link.getAttribute("rel")).toBe("noreferrer noopener");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.textContent).toBe("De1mMaNF7pZ");
  });

  it("renders no link when the entry has no URL", () => {
    render(
      <EventListView
        view={view([
          month("2026-11", "November 2026", [
            day("2026-11-15", "15 November 2026", [
              entry(1, at("2026-11-15T12:00:00Z"), "no link"),
            ]),
          ]),
        ])}
        raw={[]}
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("keeps the raw JSON behind a closed disclosure that opens", async () => {
    const user = userEvent.setup();
    render(
      <EventListView
        view={view([
          month("2026-11", "November 2026", [
            day("2026-11-15", "15 November 2026", [entry(1, at("2026-11-15T12:00:00Z"), "a row")]),
          ]),
        ])}
        raw={{ hello: "world" }}
      />,
    );

    const summary = screen.getByText("Raw data");
    const details = summary.closest("details");
    expect(details?.open).toBe(false);
    await user.click(summary);
    expect(details?.open).toBe(true);
  });
});

describe("event list — no timestamps and empty", () => {
  it("falls back to a plain list and says so", () => {
    const data: EventListViewData = {
      kind: "event-list",
      months: [],
      undated: [entry(1, null, "undated row")],
      total: 1,
      hasTimestamps: false,
    };
    render(<EventListView view={data} raw={[]} />);

    expect(screen.getByText(/no timestamps/)).toBeDefined();
    expect(screen.getByText("undated row")).toBeDefined();
    expect(screen.queryByRole("button", { name: /2026/ })).toBeNull();
  });

  it("renders a present-but-empty category as empty", () => {
    render(<EventListView view={view([])} raw={[]} />);
    expect(screen.getByText("0 entries")).toBeDefined();
    expect(screen.getByText(/holds no entries/)).toBeDefined();
  });
});
