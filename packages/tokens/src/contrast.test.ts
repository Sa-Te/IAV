import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Contrast, measured from the shipped CSS rather than from a hand-copied table.
 *
 * If a pair fails, the token changes — the threshold does not. That rule is why
 * `border-strong` is darker than the palette's first draft: the draft was 1.5:1.
 */

const CSS = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

function block(selector: string): Record<string, string> {
  const match = new RegExp(`${selector}\\s*\\{([^}]*)\\}`, "u").exec(CSS);
  if (match?.[1] === undefined) throw new Error(`no ${selector} block in tokens.css`);
  const values: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const entry = /--token-color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/u.exec(line);
    if (entry?.[1] !== undefined && entry[2] !== undefined) values[entry[1]] = entry[2];
  }
  return values;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.slice(1);
  const [r, g, b] = [0, 2, 4].map((offset) =>
    channel(Number.parseInt(value.slice(offset, offset + 2), 16)),
  );
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

export function contrast(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

const THEMES = [
  { name: "Umber", selector: '\\[data-theme="umber"\\]' },
  { name: "Paper", selector: '\\[data-theme="paper"\\]' },
] as const;

describe.each(THEMES)("$name contrast", ({ selector }) => {
  const colors = block(selector);

  const pairs: readonly { name: string; fg: string; bg: string; min: number }[] = [
    { name: "text on canvas", fg: "text", bg: "canvas", min: 7 },
    { name: "text-muted on surface", fg: "text-muted", bg: "surface", min: 4.5 },
    { name: "accent on canvas", fg: "accent", bg: "canvas", min: 4.5 },
    { name: "on-accent on accent", fg: "on-accent", bg: "accent", min: 4.5 },
    { name: "border-strong on surface", fg: "border-strong", bg: "surface", min: 3 },
  ];

  it("has every token the pairs need", () => {
    for (const pair of pairs) {
      expect(colors[pair.fg], `${pair.fg} is missing`).toBeDefined();
      expect(colors[pair.bg], `${pair.bg} is missing`).toBeDefined();
    }
  });

  it.each(pairs)("$name ≥ $min:1", ({ fg, bg, min }) => {
    const foreground = colors[fg] ?? "#000000";
    const background = colors[bg] ?? "#000000";
    const ratio = contrast(foreground, background);
    // Printed by vitest on failure, so the report can quote the measured value.
    expect(
      ratio,
      `${fg} ${foreground} on ${bg} ${background} = ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(min);
  });
});
