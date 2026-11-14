import { describe, expect, it } from "vitest";

import { formatBytes } from "./format.js";

describe("formatBytes", () => {
  it("prints zero and non-finite values as zero, never NaN", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-5)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
  });

  it("keeps bytes whole", () => {
    expect(formatBytes(999)).toBe("999 B");
  });

  it("steps through 1024-based units", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(34 * 1024 * 1024)).toBe("34 MB");
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe("1.5 GB");
  });

  it("drops the decimal once the value is three digits", () => {
    expect(formatBytes(133 * 1024 * 1024)).toBe("133 MB");
  });
});
