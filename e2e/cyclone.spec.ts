import type { Page } from "playwright/test";

import { expect, failOnPageErrors, test } from "./failures.js";
import { buildFixture } from "./fixture.js";

/**
 * `/cyclone` against a real WebGL2 context.
 *
 * What CI can and cannot prove here (AGENTS.md §9, D3): a runner has no GPU, so
 * this file never claims the vortex *renders* correctly. It asserts the branch
 * the device's own capability probe dictates, that the other branch is reachable
 * when the probe is forced low, and that the numbers the texture window reports
 * are real. Pixels and frame rate are a human check via /dev/cyclone-stats.
 */

failOnPageErrors();

const CAPABLE = 96;

interface Caps {
  readonly webgl2: boolean;
  readonly maxArrayTextureLayers: number;
  readonly renderer: string;
}

async function importFixture(page: Page): Promise<void> {
  const fixture = buildFixture();
  await page.goto("/dev/ingest");
  await page.setInputFiles('input[type="file"]', fixture.zipPath);
  await expect(page.getByText("Import complete.")).toBeVisible({ timeout: 30_000 });
}

/** The same probe createContext runs, read from a throwaway canvas. */
async function caps(page: Page): Promise<Caps> {
  return page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (gl === null) return { webgl2: false, maxArrayTextureLayers: 0, renderer: "none" };
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      webgl2: true,
      maxArrayTextureLayers: gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS) as number,
      renderer: debug === null ? "unknown" : String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)),
    };
  });
}

test("the device takes the branch its capabilities allow, and says why if it falls back", async ({
  page,
}) => {
  await importFixture(page);
  await page.goto("/cyclone");

  const found = await caps(page);
  // The runner's numbers are the evidence for which branch CI exercises, and the
  // CI log is where they have to be readable after the fact.
  console.warn(
    `cyclone probe: webgl2=${found.webgl2} layers=${found.maxArrayTextureLayers} renderer=${found.renderer}`,
  );

  const fallback = page.getByText(/cannot start the 3D view|needs more cards/);
  const canvas = page.locator("canvas.cyclone-canvas");

  if (found.webgl2 && found.maxArrayTextureLayers >= CAPABLE) {
    // A capable device that shows the grid is the bug this test exists for: the
    // fallback firing for the wrong reason.
    await expect(canvas).toBeVisible();
    await expect(fallback).toHaveCount(0);
  } else {
    await expect(fallback).toBeVisible();
    await expect(page.locator("img")).not.toHaveCount(0);
  }
});

test("a device with 64 texture-array layers gets the grid and the reason", async ({ page }) => {
  // Force the probe below the window's 96 layers. This is the branch a software
  // GL runner can take, and it must never be a dead canvas.
  await page.addInitScript((required) => {
    const original = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (parameter: number) {
      if (parameter === this.MAX_ARRAY_TEXTURE_LAYERS) return required - 32;
      return original.call(this, parameter);
    };
  }, CAPABLE);

  await importFixture(page);
  await page.goto("/cyclone");

  await expect(
    page.getByText(
      "This browser cannot start the 3D view: it needs WebGL2 with at least 96 texture-array layers.",
    ),
  ).toBeVisible();
  await expect(page.locator("canvas.cyclone-canvas")).toHaveCount(0);
  await expect(page.locator("img")).not.toHaveCount(0);
});

test("a window larger than 96 cards fills, and the vortex draws", async ({ page }) => {
  await importFixture(page);
  const found = await caps(page);
  test.skip(
    !(found.webgl2 && found.maxArrayTextureLayers >= CAPABLE),
    "no WebGL2 with 96 layers here",
  );

  // The M17 regression, read from the same overlay a person reads: a real archive
  // gave "draw calls: 0 · resident textures: 0" on a black canvas, because every
  // failed thumbnail kept its layer and the window was anchored to the wrong card.
  await page.goto("/dev/cyclone-stats");
  const summary = page.locator("p.summary").first();
  await expect(summary).not.toContainText("draw calls: 0", { timeout: 30_000 });

  const text = await summary.innerText();
  const resident = Number(/resident textures: (\d+)/.exec(text)?.[1] ?? "0");
  const drawCalls = Number(/draw calls: (\d+)/.exec(text)?.[1] ?? "0");

  expect(drawCalls).toBeGreaterThanOrEqual(1);
  // 124 fixture items, 5 of them videos with no bitmap: the window holds the rest.
  expect(resident).toBeGreaterThanOrEqual(90);
});

test("when the canvas starts, the texture window reports real resident pixels", async ({
  page,
}) => {
  await importFixture(page);
  const found = await caps(page);
  test.skip(
    !(found.webgl2 && found.maxArrayTextureLayers >= CAPABLE),
    "no WebGL2 with 96 layers here; the movement of textures is covered by the unit lane",
  );

  await page.goto("/dev/cyclone-stats");
  const summary = page.locator("p.summary").first();
  await expect(summary).toContainText(/resident textures: \d+/, { timeout: 30_000 });

  // Pop-in is allowed; a window that never fills is not. Wait for at least one
  // card before reading the numbers it claims to hold.
  await expect(summary).not.toContainText("resident textures: 0", { timeout: 30_000 });
  const text = await summary.innerText();
  const bytes = Number(/resident bytes: ([\d,]+)/.exec(text)?.[1]?.replaceAll(",", "") ?? "0");

  // 16 fixture cards × 256² × 4 ≈ 4 MB. Zero here was the measured bug: the
  // bitmap was closed before its dimensions were read.
  expect(bytes).toBeGreaterThan(0);
  expect(text).toContain("draw calls: 1");
});
