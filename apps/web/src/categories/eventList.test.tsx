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
    years: [],
    showYears: false,
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
      years: [],
      showYears: false,
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
      years: [],
      showYears: false,
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

describe("event list — the year level", () => {
  /** Two years of months, enough to engage the fold (span > 24 in the real data). */
  function yearView(): EventListViewData {
    const months = [
      month("2026-10", "October 2026", [
        day("2026-10-15", "15 October 2026", [entry(1, at("2026-10-15T12:00:00Z"), "oct-2026")]),
      ]),
      month("2025-06", "June 2025", [
        day("2025-06-15", "15 June 2025", [
          entry(2, at("2025-06-15T12:00:00Z"), "jun-2025"),
          entry(3, at("2025-06-16T12:00:00Z"), "jun-2025-b"),
        ]),
      ]),
      month("2024-01", "January 2024", [
        day("2024-01-15", "15 January 2024", [entry(4, at("2024-01-15T12:00:00Z"), "jan-2024")]),
      ]),
    ];
    return {
      kind: "event-list",
      months,
      years: [
        { key: "2026", label: "2026", months: [months[0]!], monthCount: 1, entryCount: 1 },
        { key: "2025", label: "2025", months: [months[1]!], monthCount: 1, entryCount: 2 },
        { key: "2024", label: "2024", months: [months[2]!], monthCount: 1, entryCount: 1 },
      ],
      showYears: true,
      undated: [],
      total: 4,
      hasTimestamps: true,
    };
  }

  it("opens the newest year and leaves the older ones closed", () => {
    render(<EventListView view={yearView()} raw={[]} />);

    const years = screen.getAllByRole("button", { name: /^(2026|2025|2024)/ });
    expect(years[0]?.getAttribute("aria-expanded")).toBe("true");
    expect(years[1]?.getAttribute("aria-expanded")).toBe("false");
    expect(years[2]?.getAttribute("aria-expanded")).toBe("false");
  });

  it("opening a year does not open a month", async () => {
    const user = userEvent.setup();
    render(<EventListView view={yearView()} raw={[]} />);

    // The newest year is open, but its month is not: no day headings, no rows.
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    expect(document.querySelectorAll(".event-row")).toHaveLength(0);

    const years = document.querySelectorAll(".event-year-button");
    await user.click(years[1] as Element);

    const months = document.querySelectorAll(".event-month-button");
    expect(months).toHaveLength(2);
    for (const monthButton of months) {
      expect(monthButton.getAttribute("aria-expanded")).toBe("false");
    }
    expect(screen.queryByText("jun-2025")).toBeNull();
    expect(screen.getByRole("button", { name: /June 2025/ })).toBeDefined();
  });

  it("collapsing a year hides its months", async () => {
    const user = userEvent.setup();
    render(<EventListView view={yearView()} raw={[]} />);

    const year2026 = document.querySelector(".event-year-button") as Element;
    expect(screen.getByRole("button", { name: /October 2026/ })).toBeDefined();

    await user.click(year2026);

    expect(year2026.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: /October 2026/ })).toBeNull();
  });

  it("keeps the seven-day cap inside an open month under a year", async () => {
    const user = userEvent.setup();
    const data = yearView();
    const bigMonth = month(
      "2025-06",
      "June 2025",
      Array.from({ length: 9 }, (_, index) =>
        day(`2025-06-${String(index + 1).padStart(2, "0")}`, `${index + 1} June 2025`, [
          entry(index + 1, at("2025-06-01T12:00:00Z"), `day ${index + 1}`),
        ]),
      ),
    );
    const withBigMonth: EventListViewData = {
      ...data,
      months: data.months.map((value) => (value.key === "2025-06" ? bigMonth : value)),
      years: data.years.map((year) =>
        year.key === "2025" ? { ...year, months: [bigMonth], monthCount: 1, entryCount: 9 } : year,
      ),
    };
    render(<EventListView view={withBigMonth} raw={[]} />);

    await user.click(document.querySelectorAll(".event-year-button")[1] as Element);
    await user.click(screen.getByRole("button", { name: /June 2025/ }));

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(7);
    await user.click(screen.getByRole("button", { name: "Show 2 more days" }));
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(9);
  });

  it("renders no year fold when the view says the span is short", () => {
    render(
      <EventListView
        view={view([
          month("2026-10", "October 2026", [
            day("2026-10-15", "15 October 2026", [entry(1, at("2026-10-15T12:00:00Z"), "only")]),
          ]),
        ])}
        raw={[]}
      />,
    );

    expect(document.querySelector(".event-year-button")).toBeNull();
    expect(screen.getByText("only")).toBeDefined();
  });
});
