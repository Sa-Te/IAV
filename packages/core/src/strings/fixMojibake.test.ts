import { describe, expect, it } from "vitest";

import { fixMojibake } from "./fixMojibake.js";

/**
 * These cases exist because M2 measured the real export: files are ASCII, and the
 * corruption is \u-escaped inside string values (ADR 0003). "caf\u00c3\u00a9" is
 * literally how "café" arrives: the UTF-8 bytes C3 A9, read as latin-1.
 */
describe("fixMojibake", () => {
  it("returns pure ASCII identical (fast path)", () => {
    const input = "hello, world 123";
    expect(fixMojibake(input)).toBe(input);
  });

  it("returns an empty string unchanged", () => {
    expect(fixMojibake("")).toBe("");
  });

  it("corrects a known mojibake string to the accented text", () => {
    // "café" double-encoded: bytes C3 A9 rendered as Ã©
    expect(fixMojibake("caf\u00c3\u00a9")).toBe("caf\u00e9");
  });

  it("corrects emoji mojibake when nothing else is present", () => {
    // 🎉 is F0 9F 8E 89 in UTF-8, so it arrives as four latin-1 code points
    expect(fixMojibake("\u00f0\u009f\u008e\u0089")).toBe("\u{1f389}");
  });

  it("leaves a string alone when it also contains a genuine emoji", () => {
    // Mixing real non-latin text with mojibake is ambiguous; corrupting real
    // text is worse than leaving it broken.
    const input = "\u{1f389} caf\u00c3\u00a9";
    expect(fixMojibake(input)).toBe(input);
  });

  it("returns the original string when the bytes are not valid UTF-8", () => {
    const input = "caf\u00c3"; // lone 0xC3, no continuation byte
    expect(fixMojibake(input)).toBe(input);
  });

  it("leaves correctly typed non-ASCII text unchanged", () => {
    const input = "caf\u00e9"; // properly typed é, not mojibake
    expect(fixMojibake(input)).toBe(input);
  });

  it("is idempotent across every case above", () => {
    const cases = [
      "hello, world 123",
      "",
      "caf\u00c3\u00a9",
      "\u00f0\u009f\u008e\u0089",
      "\u{1f389} caf\u00c3\u00a9",
      "caf\u00c3",
      "caf\u00e9",
    ];
    for (const input of cases) {
      const once = fixMojibake(input);
      expect(fixMojibake(once)).toBe(once);
    }
  });

  it("never throws on arbitrary latin-1 input", () => {
    for (let code = 0x80; code <= 0xff; code += 1) {
      expect(() => fixMojibake(String.fromCharCode(code))).not.toThrow();
    }
  });
});
