// @vitest-environment jsdom
import { type EventEntry, type EventListView as EventListViewData } from "@instavault/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EventListView } from "./EventListView.js";

/** The row's presentation of a sticker/poll preview (see `eventList.test.tsx`). */

afterEach(cleanup);

const at = (iso: string): number => Math.floor(new Date(iso).getTime() / 1000);

function entry(ordinal: number, timestamp: number, hero: string | null = null): EventEntry {
  return {
    ordinal,
    timestamp,
    date: `date ${ordinal}`,
    hero: hero === null ? null : { label: "Caption", text: hero },
    url: null,
    shortcode: null,
    preview: null,
    fields: [],
  };
}

function view(entries: readonly EventEntry[]): EventListViewData {
  return {
    kind: "event-list",
    months: [
      {
        key: "2026-10",
        label: "October 2026",
        days: [{ key: "2026-10-15", label: "15 October 2026", entries }],
        entryCount: entries.length,
      },
    ],
    years: [],
    showYears: false,
    undated: [],
    total: entries.length,
    hasTimestamps: true,
  };
}

describe("event list — stickers and polls apply their values", () => {
  function renderEntry(item: EventEntry): void {
    render(<EventListView view={view([item])} raw={[]} />);
  }

  it("paints the sticker with the export's background and text colours", () => {
    renderEntry({
      ...entry(1, at("2026-10-15T12:00:00Z")),
      preview: {
        kind: "sticker",
        emoji: "😍",
        textColour: "black",
        backgroundColour: "white",
      },
    });

    const sticker = document.querySelector(".event-sticker") as HTMLElement;
    expect(sticker).not.toBeNull();
    expect(sticker.style.backgroundColor).toBeTruthy();
    expect(sticker.style.color).toBeTruthy();
    expect(sticker.getAttribute("aria-label")).toBe("Sticker 😍");
    // The value is applied, never printed.
    expect(document.body.textContent).not.toContain("white");
  });

  it("renders poll options at their declared sizes and the colour as a swatch", () => {
    renderEntry({
      ...entry(1, at("2026-10-15T12:00:00Z"), "a poll"),
      preview: {
        kind: "poll",
        colour: "Black",
        options: [
          { text: "Yes", size: 35 },
          { text: "No", size: 22 },
        ],
      },
    });

    const options = document.querySelectorAll(".event-poll-option");
    expect([...options].map((option) => option.textContent)).toEqual(["Yes", "No"]);
    expect((options[0] as HTMLElement).style.fontSize).toBe("35px");
    expect((options[1] as HTMLElement).style.fontSize).toBe("22px");
    expect(document.querySelector(".event-poll-colour")?.getAttribute("aria-label")).toBe(
      "Poll colour: Black",
    );
    expect(document.querySelectorAll(".event-poll-option").length).toBe(2);
  });

  it("ignores an out-of-range size instead of breaking the row", () => {
    renderEntry({
      ...entry(1, at("2026-10-15T12:00:00Z"), "a poll"),
      preview: { kind: "poll", colour: null, options: [{ text: "Huge", size: 4000 }] },
    });

    const option = document.querySelector(".event-poll-option") as HTMLElement;
    expect(option.style.fontSize).toBe("40px");
  });
});
