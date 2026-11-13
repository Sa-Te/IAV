import { describe, expect, it } from "vitest";

import { toSettingsView } from "./settingsView.js";

/**
 * The contract the settings screen renders: labelled fields, nested lists,
 * timestamps, bare labels, and a refusal for records that are not label/value.
 */

describe("toSettingsView — one envelope", () => {
  it("reads scalars, a timestamp, a nested list, a description and a bare label", () => {
    const view = toSettingsView({
      data: {
        fbid: "1",
        media: [],
        timestamp: 1_700_000_000,
        label_values: [
          { label: "Scalar", value: "text" },
          { label: "When", timestamp_value: 1_700_000_100 },
          {
            label: "Group",
            title: "Group title",
            dict: [
              { label: "Child A", value: "a" },
              { label: "Child B", value: "b" },
            ],
          },
          { label: "Missing" },
          { label: "Explained", value: "v", description: "the export's own note" },
          { label: "Link", value: "destination", href: "https://example.invalid/x" },
        ],
      },
    });

    expect(view).not.toBeNull();
    if (view === null) return;
    expect(view.entries).toHaveLength(1);

    const fields = view.entries[0]?.fields ?? [];
    expect(fields.map((field) => field.label)).toEqual([
      "Scalar",
      "When",
      "Group",
      "Missing",
      "Explained",
      "Link",
      "timestamp",
    ]);

    expect(fields[0]?.value).toEqual({ kind: "text", text: "text" });
    expect(fields[1]?.value.kind).toBe("timestamp");
    if (fields[1]?.value.kind === "timestamp") {
      expect(fields[1].value.raw).toBe(1_700_000_100);
      expect(fields[1].value.date).toEqual(expect.any(String));
    }
    expect(fields[2]?.title).toBe("Group title");
    expect(fields[2]?.value).toEqual({
      kind: "list",
      fields: [
        { label: "Child A", value: { kind: "text", text: "a" } },
        { label: "Child B", value: { kind: "text", text: "b" } },
      ],
    });
    expect(fields[3]?.value).toEqual({ kind: "absent" });
    expect(fields[4]?.description).toBe("the export's own note");
    expect(fields[5]?.value).toEqual({
      kind: "text",
      text: "destination",
      href: "https://example.invalid/x",
    });
    expect(fields[6]?.value.kind).toBe("timestamp");
  });

  it("does not turn a zero timestamp into 1970", () => {
    const view = toSettingsView({
      data: { label_values: [{ label: "Never", timestamp_value: 0 }] },
    });
    expect(view?.entries[0]?.fields[0]?.value).toEqual({
      kind: "timestamp",
      raw: 0,
      date: null,
    });
  });

  it("reads string_map_data as labelled fields", () => {
    const view = toSettingsView({
      data: {
        monetization_eligibility: [
          {
            string_map_data: {
              Product: { href: "", value: "BRANDED CONTENT", timestamp: 0 },
              Decision: { href: "", value: "APPROVED", timestamp: 0 },
            },
          },
        ],
      },
    });

    expect(view?.entries[0]?.fields.map((field) => field.label)).toEqual(["Product", "Decision"]);
    expect(view?.entries[0]?.fields[0]?.value).toEqual({ kind: "text", text: "BRANDED CONTENT" });
  });
});

describe("toSettingsView — entries and edges", () => {
  it("gives thirty entries thirty sections, in order", () => {
    const data = Array.from({ length: 30 }, (_, index) => ({
      timestamp: 1_700_000_000 + index,
      label_values: [{ label: "Device", value: `device-${index}` }],
    }));
    const view = toSettingsView({ data });

    expect(view?.entries).toHaveLength(30);
    expect(view?.entries[0]?.ordinal).toBe(1);
    expect(view?.entries[29]?.ordinal).toBe(30);
    expect(view?.entries[29]?.fields[0]?.value).toEqual({
      kind: "text",
      text: "device-29",
    });
  });

  it("renders a non-empty vec as a labelled list", () => {
    const view = toSettingsView({
      data: {
        label_values: [{ label: "List", vec: [{ label: "Inner", value: "x" }, "plain"] }],
      },
    });

    expect(view?.entries[0]?.fields[0]?.value).toEqual({
      kind: "list",
      fields: [
        { label: "Inner", value: { kind: "text", text: "x" } },
        { label: "Item 2", value: { kind: "text", text: "plain" } },
      ],
    });
  });

  it("keeps an empty list as a list with no fields", () => {
    const view = toSettingsView({ data: { label_values: [{ label: "Empty", dict: [] }] } });
    expect(view?.entries[0]?.fields[0]?.value).toEqual({ kind: "list", fields: [] });
  });

  it("treats an empty array as a present category with no entries", () => {
    expect(toSettingsView({ data: [] })).toEqual({ kind: "settings", entries: [] });
  });

  it("returns null for a record with no label layer", () => {
    expect(toSettingsView({ data: [{ title: "a" }, { title: "b" }] })).toBeNull();
    expect(toSettingsView({ data: { mystery_data: [{ alpha: 1 }] } })).toBeNull();
    expect(toSettingsView({ data: undefined })).toBeNull();
  });
});
