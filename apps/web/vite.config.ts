import { execSync } from "node:child_process";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * The build's git short hash, shown on the landing page so a screenshot or a bug
 * report can be tied to a commit. Falls back to "unknown" when git is absent
 * (a tarball, a CI cache, a Tauri bundle).
 */
function gitShortHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __GIT_HASH__: JSON.stringify(gitShortHash()),
  },
  build: {
    outDir: "dist",
    target: "es2022",
  },
  // The ingest worker is created with { type: "module" } and uses top-level await
  // to open IndexedDB before wiring its message handler; IIFE workers cannot.
  worker: {
    format: "es",
  },
});
