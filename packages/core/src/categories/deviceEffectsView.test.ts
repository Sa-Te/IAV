import { describe, expect, it } from "vitest";

import { toDeviceEffectsView } from "./deviceEffectsView.js";

const ID = "0".repeat(32);

function device(index: number, profile: unknown = { value: "same" }) {
  return {
    timestamp: 1_700_000_000 + index,
    media: [],
    label_values: [
      { label: "Device ID", value: ID },
      { label: "Metadata", dict: [{ label: "Supported SDK versions", value: "149.0" }] },
      {
        label: "Device metadata",
        dict: [
          { label: "World tracking", value: "True" },
          { label: "Hair detection", value: profile },
        ],
      },
    ],
    fbid: `fbid-${index}`,
  };
}

describe("toDeviceEffectsView", () => {
  it("collapses repeated records of one identity and one profile", () => {
    const view = toDeviceEffectsView({ data: [device(0), device(1)] });

    expect(view?.recordCount).toBe(2);
    expect(view?.profiles).toHaveLength(1);
    expect(view?.profiles[0]?.identity).toEqual({ label: "Device ID", text: ID });
    expect(view?.profiles[0]?.records).toHaveLength(2);
    expect(view?.profiles[0]?.records[0]?.timestamp?.value.kind).toBe("timestamp");
    // The profile keeps the two nested lists, not the per-record timestamp.
    expect(view?.profiles[0]?.fields).toHaveLength(2);
    expect(view?.profiles[0]?.fields[0]?.label).toBe("Metadata");
  });

  it("collapses the thirty measured records into one profile", () => {
    const view = toDeviceEffectsView({
      data: Array.from({ length: 30 }, (_, index) => device(index)),
    });
    expect(view?.recordCount).toBe(30);
    expect(view?.profiles).toHaveLength(1);
    expect(view?.profiles[0]?.records).toHaveLength(30);
  });

  it("keeps two profiles when the identities differ", () => {
    const other = device(1);
    other.label_values[0] = { label: "Device ID", value: "1".repeat(32) };
    const view = toDeviceEffectsView({ data: [device(0), other] });
    expect(view?.profiles).toHaveLength(2);
    expect(view?.recordCount).toBe(2);
  });

  it("returns null when one identity carries two different profiles", () => {
    expect(
      toDeviceEffectsView({ data: [device(0), device(1, { value: "different" })] }),
    ).toBeNull();
  });

  it("treats an empty array as a present category with no records", () => {
    expect(toDeviceEffectsView({ data: [] })).toEqual({
      kind: "device-effects",
      profiles: [],
      recordCount: 0,
    });
  });

  it("returns null when the first field is not a scalar identity", () => {
    const noIdentity = {
      label_values: [{ label: "Metadata", dict: [{ label: "A", value: "b" }] }],
    };
    expect(toDeviceEffectsView({ data: [noIdentity] })).toBeNull();
    expect(toDeviceEffectsView({ data: [{ title: "no labels" }] })).toBeNull();
  });
});
