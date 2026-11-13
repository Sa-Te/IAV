import { defineConfig } from "playwright/test";

/**
 * The browser lane. Separate from `pnpm verify`, which stays under 20 seconds
 * (AGENTS.md §9); this lane runs `pnpm test:e2e`.
 *
 * Two decisions shape this file:
 *  - It drives the **built** app through `vite preview`, never the dev server.
 *    M4's worker bug existed only in the build, and a dev-server test would not
 *    have caught it.
 *  - The build it previews is the dev-mode build (`pnpm build:e2e`). The import
 *    route and the dev overlays live behind `import.meta.env.DEV`
 *    (apps/web/src/main.tsx, routes.tsx), so a production build does not contain
 *    them at all. The bundle under test is still produced by `vite build`, with
 *    the same worker emission that M4's bug lived in.
 */
const PORT = 4173;

export default defineConfig({
  testDir: "e2e",
  // One worker: both the preview server and the origin's IndexedDB are shared.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      // CI runners have no GPU. SwiftShader is Chromium's software GL, and builds
      // that ship without a GPU refuse WebGL to it unless this flag says so.
      args: ["--enable-unsafe-swiftshader"],
    },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: `pnpm build:e2e && pnpm --filter @instavault/web preview --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
