// @vitest-environment jsdom
import { toAvatarItemsView, toDeviceEffectsView } from "@instavault/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { AvatarItemsView } from "./AvatarItemsView.js";
import { DeviceEffectsView } from "./DeviceEffectsView.js";

afterEach(cleanup);

const avatar = (index: number) => ({
  item: `https://scontent.invalid/avatar-${index}.png?token=${index}`,
  type: "FREE",
  acquisition_time: 1_700_000_000 + index,
});

const ID = "0".repeat(32);

const device = (index: number) => ({
  timestamp: 1_700_000_000 + index,
  media: [],
  label_values: [
    { label: "Device ID", value: ID },
    { label: "Metadata", dict: [{ label: "Supported SDK versions", value: "149.0" }] },
    {
      label: "Device metadata",
      dict: [
        { label: "World tracking", value: "True" },
        { label: "Hair detection", value: "False" },
      ],
    },
  ],
});

function renderAvatars(count: number): void {
  const data = Array.from({ length: count }, (_, index) => avatar(index));
  const view = toAvatarItemsView({ data });
  expect(view).not.toBeNull();
  if (view === null) return;
  render(<AvatarItemsView view={view} raw={data} />);
}

function renderDevices(count: number): void {
  const data = Array.from({ length: count }, (_, index) => device(index));
  const view = toDeviceEffectsView({ data });
  expect(view).not.toBeNull();
  if (view === null) return;
  render(<DeviceEffectsView view={view} raw={data} />);
}

describe("avatar items screen", () => {
  it("renders one labelled placeholder per item, never an invented thumbnail", () => {
    renderAvatars(13);

    expect(screen.getByText("13 items")).toBeDefined();
    expect(screen.getAllByText("Image not included in the export")).toHaveLength(13);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(13);
    expect(screen.getByRole("heading", { level: 2, name: "Item 1" })).toBeDefined();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows the item's key and its URL as a user-initiated link", () => {
    renderAvatars(1);
    const link = screen.getByRole("link", { name: avatar(0).item });
    expect(link.getAttribute("href")).toBe(avatar(0).item);
    expect(link.getAttribute("rel")).toBe("noreferrer noopener");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(screen.getByText("item").tagName).toBe("DT");
  });

  it("renders a present-but-empty category as empty", () => {
    renderAvatars(0);
    expect(screen.getByText("0 items")).toBeDefined();
    expect(screen.getByText(/holds no items/)).toBeDefined();
  });

  it("keeps the raw JSON behind a closed disclosure", async () => {
    const user = userEvent.setup();
    renderAvatars(1);
    const summary = screen.getByText("Raw data");
    const details = summary.closest("details");
    expect(details?.open).toBe(false);
    await user.click(summary);
    expect(details?.open).toBe(true);
  });
});

describe("device effects screen", () => {
  it("collapses thirty records of one device into one profile", () => {
    renderDevices(30);

    expect(screen.getByText("30 records · 1 device profile")).toBeDefined();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "Device ID" })).toBeDefined();
    expect(screen.getAllByText(/^Record \d+$/)).toHaveLength(30);
  });

  it("keeps each device's nested feature lists as labelled sections", () => {
    renderDevices(1);

    expect(screen.getByRole("heading", { level: 3, name: "Metadata" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 3, name: "Device metadata" })).toBeDefined();
    expect(screen.getByText("Supported SDK versions").tagName).toBe("DT");
    expect(screen.getByText("World tracking").tagName).toBe("DT");
    expect(screen.getByText("Hair detection").tagName).toBe("DT");
  });

  it("renders a present-but-empty category as empty", () => {
    renderDevices(0);
    expect(screen.getByText("0 records · 0 device profiles")).toBeDefined();
    expect(screen.getByText(/holds no records/)).toBeDefined();
  });
});
