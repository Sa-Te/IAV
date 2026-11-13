import type { JSX } from "react";

/**
 * The raw payload, always one closed disclosure away. Every bespoke screen ends
 * with it so nothing is hidden by a nicer presentation (AGENTS.md §6).
 */
export function RawDisclosure({ raw }: { raw: unknown }): JSX.Element {
  return (
    <details className="settings-raw">
      <summary>Raw data</summary>
      <pre>{JSON.stringify(raw, null, 2) ?? "null"}</pre>
    </details>
  );
}
