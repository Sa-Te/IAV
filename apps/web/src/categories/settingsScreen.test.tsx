// @vitest-environment jsdom
import { toSettingsView } from "@instavault/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { SettingsView } from "./SettingsView.js";

afterEach(cleanup);

const LONG = "x".repeat(357);

function renderData(data: unknown): void {
  const view = toSettingsView({ data });
  expect(view).not.toBeNull();
  if (view === null) return;
  render(<SettingsView view={view} raw={data} />);
}

describe("settings screen — one entry", () => {
  it("renders each label/value pair as a labelled field, not a table row", () => {
    renderData({
      label_values: [
        { label: "Contact syncing", value: "True" },
        { label: "First country code", value: "IN" },
      ],
    });

    expect(screen.getByText("Contact syncing").tagName).toBe("DT");
    expect(screen.getByText("True").tagName).toBe("DD");
    expect(screen.getByText("1 entry")).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows a timestamp as a localised date, with the raw number only in the title", () => {
    renderData({ label_values: [{ label: "Last login", timestamp_value: 1_786_001_771 }] });

    expect(screen.getByText("Last login").tagName).toBe("DT");
    // The raw Unix number is not printed beside the date; it is the hover title.
    expect(screen.queryByText("1786001771")).toBeNull();
    const date = document.querySelector(".settings-date");
    expect(date?.textContent).toBeTruthy();
    expect(date?.getAttribute("title")).toBe("1786001771");
  });

  it("shows 0 as Not set and never as 1970", () => {
    renderData({ label_values: [{ label: "Never", timestamp_value: 0 }] });
    const value = document.querySelector(".settings-absent");
    expect(value?.textContent).toBe("Not set");
    expect(value?.getAttribute("title")).toBe("0");
    expect(screen.queryByText(/1970/)).toBeNull();
  });

  it("distinguishes a bare label from an empty string", () => {
    renderData({
      label_values: [{ label: "Bare" }, { label: "Blank", value: "" }],
    });

    expect(screen.getByText("Not provided")).toBeDefined();
    expect(screen.getByText("Empty")).toBeDefined();
  });

  it("renders a URL as a real link that the app never fetches", () => {
    renderData({
      label_values: [{ label: "Destination", value: "https://example.invalid/x" }],
    });

    const link = screen.getByRole("link", { name: "https://example.invalid/x" });
    expect(link.getAttribute("href")).toBe("https://example.invalid/x");
    expect(link.getAttribute("rel")).toBe("noreferrer noopener");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("truncates an opaque value visually while keeping the full text", () => {
    renderData({ label_values: [{ label: "Token", value: LONG }] });

    const value = screen.getByText(LONG);
    expect(value.className).toContain("settings-opaque");
    expect(value.getAttribute("tabindex")).toBe("0");
    expect(value.getAttribute("title")).toBe(LONG);
    expect(value.textContent).toBe(LONG);
  });
});

describe("settings screen — nested lists and many entries", () => {
  it("renders a nested array as a labelled section, not a JSON blob", () => {
    renderData({
      label_values: [
        {
          label: "Audience",
          title: "Close friends",
          dict: [
            { label: "First", value: "a" },
            { label: "Second", value: "b" },
          ],
        },
      ],
    });

    expect(screen.getByRole("heading", { level: 3, name: "Audience" })).toBeDefined();
    expect(screen.getByText("Close friends")).toBeDefined();
    expect(screen.getByText("First").tagName).toBe("DT");
    expect(screen.getByText("Second").tagName).toBe("DT");
  });

  it("says an empty nested list is empty instead of hiding it", () => {
    renderData({ label_values: [{ label: "Audience", dict: [] }] });
    expect(screen.getByRole("heading", { level: 3, name: "Audience" })).toBeDefined();
    expect(screen.getByText("None in this export")).toBeDefined();
  });

  it("gives thirty entries thirty sections", () => {
    renderData(
      Array.from({ length: 30 }, (_, index) => ({
        label_values: [{ label: "Device", value: `device-${index}` }],
      })),
    );

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings).toHaveLength(30);
    expect(headings[0]?.textContent).toBe("Entry 1");
    expect(headings[29]?.textContent).toBe("Entry 30");
    expect(screen.getByText("device-29")).toBeDefined();
  });
});

describe("settings screen — raw data and empty", () => {
  it("keeps the raw JSON behind a closed disclosure that opens", async () => {
    const user = userEvent.setup();
    renderData({ label_values: [{ label: "Scalar", value: "text" }] });

    const summary = screen.getByText("Raw data");
    const details = summary.closest("details");
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);

    await user.click(summary);
    expect(details?.open).toBe(true);
  });

  it("renders a present-but-empty category as empty, not as absent", () => {
    renderData([]);
    expect(screen.getByText(/holds no entries/)).toBeDefined();
    expect(screen.getByText("0 entries")).toBeDefined();
  });
});
