import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * A few appearance rules that are easier to regress than to notice: a focus ring
 * that disappears on a dark photo, a zebra built from rgba instead of a token, a
 * shimmer that ignores reduced motion. Asserted against the stylesheet text
 * because jsdom does not apply stylesheets.
 */

const components = readFileSync(new URL("./components.css", import.meta.url), "utf8");
const views = readFileSync(new URL("./views.css", import.meta.url), "utf8");

function rule(css: string, selector: string): string {
  const index = css.indexOf(selector);
  if (index === -1) throw new Error(`no ${selector} rule`);
  return css.slice(index, css.indexOf("}", index));
}

describe("media focus and detail", () => {
  it("gives a tile a focus ring with a canvas halo, so a dark photo cannot hide it", () => {
    const block = rule(components, ".tile:focus-visible");

    expect(block).toContain("var(--token-color-accent)");
    expect(block).toContain("var(--token-color-canvas)");
  });

  it("stages the detail view on the scrim token in both themes", () => {
    expect(rule(components, ".detail {")).toContain("var(--token-color-scrim)");
    expect(components).toContain("--token-color-on-scrim");
  });
});

describe("tables", () => {
  it("zebras by token, not by an alpha overlay", () => {
    const block = rule(views, ".category-table tbody tr:nth-child(even)");

    expect(block).toContain("var(--token-color-surface)");
    expect(block).not.toContain("rgba");
  });

  it("right-aligns numeric columns with tabular figures", () => {
    const block = rule(views, ".tabular");

    expect(block).toContain("text-align: right");
    expect(block).toContain("tabular-nums");
  });
});

describe("reduced motion", () => {
  it("turns the loading shimmer off", () => {
    const start = components.indexOf("@media (prefers-reduced-motion: reduce)");
    const block = components.slice(start, components.indexOf("}\n}", start));

    expect(block).toContain(".state-skeleton-bar");
    expect(block).toContain("animation: none");
  });
});
