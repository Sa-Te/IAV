import { describe, expect, it } from "vitest";

import { isIos, ZIP_MEMORY_WARNING_BYTES } from "./limits.js";

describe("isIos", () => {
  it("recognises the iPhone and iPad user agents", () => {
    expect(
      isIos(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
      ),
    ).toBe(true);
    expect(
      isIos("Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1"),
    ).toBe(true);
  });

  it("does not claim a desktop or Android browser", () => {
    expect(isIos("Mozilla/5.0 (X11; Linux x86_64) Firefox/128.0")).toBe(false);
    expect(isIos("Mozilla/5.0 (Linux; Android 14) Chrome/120.0")).toBe(false);
    expect(isIos("")).toBe(false);
  });

  it("names the 300 MB memory note in bytes", () => {
    expect(ZIP_MEMORY_WARNING_BYTES).toBe(300 * 1024 * 1024);
  });
});
