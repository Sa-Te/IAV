import { expect, test as base } from "playwright/test";

/**
 * A console error or an uncaught page error fails the test.
 *
 * Collection lives in a fixture so every spec sees the same listener; the
 * assertion lives in an `afterEach` because Playwright prints a hook's error next
 * to the body's error, but silently drops a fixture teardown's.
 *
 * AGENTS.md §15: a browser-only failure is paired with the log line, not
 * described.
 */
export const test = base.extend<{ pageFailures: string[] }>({
  // `auto`: the listener must exist before the body runs. A fixture that is only
  // set up because an `afterEach` asked for it attaches after the error it was
  // meant to catch.
  pageFailures: [
    async ({ page }, use) => {
      const failures: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") failures.push(`console: ${message.text()}`);
      });
      page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
      await use(failures);
    },
    { auto: true },
  ],
});

/** Register once per spec file. */
export function failOnPageErrors(): void {
  test.afterEach(({ pageFailures }) => {
    expect(pageFailures).toEqual([]);
  });
}

export { expect } from "playwright/test";
