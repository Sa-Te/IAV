import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * jsdom does not apply `@media print` in getComputedStyle, so this asserts the
 * stylesheet contract instead: the shell is hidden, the conversation is ink on
 * paper, and a message cannot split across a page.
 */
const css = readFileSync(new URL("../styles/print.css", import.meta.url), "utf8");

describe("print stylesheet", () => {
  it("wraps the rules in a print media query", () => {
    expect(css).toContain("@media print");
  });

  it("hides the shell, navigation and controls", () => {
    for (const selector of [".app-header", ".sidebar", ".print-hide", ".gallery > h1"]) {
      expect(css).toContain(selector);
    }
  });

  it("renders ink on paper and keeps messages whole", () => {
    expect(css).toContain("var(--token-color-print-ink)");
    expect(css).toContain("var(--token-color-print-paper)");
    expect(css).toContain("break-inside: avoid");
    expect(css).toContain(".print-title");
  });
});
