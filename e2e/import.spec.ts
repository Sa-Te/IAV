import { expect, failOnPageErrors, test } from "./failures.js";

import { buildFixture } from "./fixture.js";

/**
 * The import path, in a real browser, against the built app (see
 * playwright.config.ts for why the build is the target).
 *
 * The summary is read through locators, never a timeout: the test waits for a
 * value it can name. Console and page errors are collected for the whole run —
 * a green summary over a burning console is not a green import.
 */

failOnPageErrors();

interface StoredArchive {
  readonly id: string;
  readonly fingerprint: string;
  readonly counts: { readonly mediaStored: number; readonly entries: number };
}

test("a ZIP imports, reports exact counts, and lands in IndexedDB", async ({ page }) => {
  const fixture = buildFixture();
  const { expected } = fixture;

  await page.goto("/dev/ingest");
  await page.setInputFiles('input[type="file"]', fixture.zipPath);

  const completed = page.getByText("Import complete.");
  await expect(completed).toBeVisible({ timeout: 30_000 });

  // One cell per labelled row: the summary is the contract with the pipeline.
  const cell = (label: string) => page.locator("tr", { hasText: label }).locator("td").first();
  await expect(cell("Categories")).toHaveText(String(expected.categories));
  await expect(cell("Entries")).toHaveText(String(expected.entries));
  await expect(cell("Media stored")).toHaveText(String(expected.mediaStored));
  await expect(cell("Media missing")).toHaveText(String(expected.mediaMissing));
  await expect(cell("Unrecognised")).toHaveText(String(expected.unrecognised));
  await expect(cell("Fingerprint")).toHaveText(/^fmt-[0-9a-f]{6}$/);

  // The other half of "it imported": what a reload would find on this device.
  const stored = await page.evaluate(async () => {
    const open = (): Promise<IDBDatabase> =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("instavault");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("open failed"));
      });
    const db = await open();
    const count = (store: string): Promise<number> =>
      new Promise((resolve, reject) => {
        const request = db.transaction(store, "readonly").objectStore(store).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("count failed"));
      });
    const all = (store: string): Promise<StoredArchive[]> =>
      new Promise((resolve, reject) => {
        const request = db.transaction(store, "readonly").objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result as StoredArchive[]);
        request.onerror = () => reject(request.error ?? new Error("read failed"));
      });
    const [archives, categories, media] = await Promise.all([
      all("archive"),
      count("categories"),
      count("media"),
    ]);
    db.close();
    return { archives, categories, media };
  });

  expect(stored.archives).toHaveLength(1);
  expect(stored.archives[0]?.id).toBe("current");
  expect(stored.archives[0]?.fingerprint).toMatch(/^fmt-/);
  expect(stored.archives[0]?.counts.entries).toBe(expected.entries);
  expect(stored.categories).toBe(expected.categories);
  expect(stored.media).toBe(expected.mediaStored);
});
