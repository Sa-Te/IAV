#!/usr/bin/env node
/**
 * `pnpm test:e2e` — the browser lane's only entry point.
 *
 * It refuses to start when the Chromium that playwright pins is not on disk,
 * and prints the command that would install it rather than downloading a
 * browser behind your back mid-test. Then it runs the suite.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

import { chromium } from "playwright";

const executable = chromium.executablePath();
if (!existsSync(executable)) {
  console.error(`browser-check: no Chromium at ${executable}`);
  console.error(
    "browser-check: install the pinned build with `pnpm exec playwright install chromium`",
  );
  process.exit(1);
}

const result = spawnSync("pnpm", ["exec", "playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
