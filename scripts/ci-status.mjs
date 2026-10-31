#!/usr/bin/env node
// Prints the latest CI run for HEAD. Advisory only: it never fails a build.
import { execSync } from "node:child_process";

const sh = (command) => execSync(command, { encoding: "utf8" }).trim();
const manual = "gh run list --limit 1\n  gh run view <id> --log-failed";

try {
  const sha = sh("git rev-parse --short HEAD");
  const runs = JSON.parse(
    sh("gh run list --limit 5 --json databaseId,headSha,conclusion,status,url"),
  );
  const run = runs.find((candidate) => candidate.headSha?.startsWith(sha));
  if (!run) throw new Error("no run for HEAD");
  const state = run.status === "completed" ? run.conclusion : run.status;
  console.log(`${sha}  ${state}  ${run.url}`);
  if (state !== "success")
    console.log(`\nFailing step:\n  gh run view ${run.databaseId} --log-failed`);
} catch {
  console.log("gh unavailable or no run found for HEAD. Check manually:");
  console.log(`  ${manual}`);
}
