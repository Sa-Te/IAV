import { describe, expect, it } from "vitest";

import { normaliseStrings } from "./normaliseStrings.js";

describe("normaliseStrings", () => {
  it("repairs strings at any depth in objects and arrays", () => {
    const input = {
      caption: "caf\u00c3\u00a9",
      nested: {
        list: ["plain", "\u00f0\u009f\u008e\u0089"],
        deeper: [{ text: "caf\u00c3\u00a9" }],
      },
    };

    expect(normaliseStrings(input)).toEqual({
      caption: "caf\u00e9",
      nested: { list: ["plain", "\u{1f389}"], deeper: [{ text: "caf\u00e9" }] },
    });
  });

  it("leaves non-string values untouched", () => {
    const input = { n: 42, f: 1.5, t: true, z: null, u: undefined };
    expect(normaliseStrings(input)).toEqual(input);
  });

  it("does not transform keys, even ones containing mojibake", () => {
    const key = "caf\u00c3\u00a9";
    const output = normaliseStrings({ [key]: "caf\u00c3\u00a9" });
    expect(Object.keys(output)).toEqual([key]);
    expect(output[key]).toBe("caf\u00e9");
  });

  it("does not mutate its input", () => {
    const input = { caption: "caf\u00c3\u00a9", list: ["\u00f0\u009f\u008e\u0089"] };
    const frozenCopy = structuredClone(input);
    deepFreeze(input);

    const output = normaliseStrings(input);

    expect(input).toEqual(frozenCopy);
    expect(output).not.toBe(input);
    expect(output.caption).toBe("caf\u00e9");
  });

  it("returns a new structure for nested values, not a shared reference", () => {
    const inner = { text: "plain" };
    const output = normaliseStrings({ inner });
    expect(output.inner).not.toBe(inner);
    expect(output.inner).toEqual(inner);
  });

  it("handles top-level scalars and arrays", () => {
    expect(normaliseStrings("caf\u00c3\u00a9")).toBe("caf\u00e9");
    expect(normaliseStrings([1, "caf\u00c3\u00a9", null])).toEqual([1, "caf\u00e9", null]);
    expect(normaliseStrings(null)).toBeNull();
    expect(normaliseStrings(0)).toBe(0);
  });
});

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}
