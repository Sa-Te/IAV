import type { JSX } from "react";

/**
 * M1 landing page, deliberately the only view: a heading, an honest status line,
 * and the build's git hash. The visual system is its own later milestone — adding
 * a styling layer before there is a component to style is ceremony.
 */
export function App(): JSX.Element {
  return (
    <main>
      <h1>InstaVault</h1>
      <p>Pre-alpha scaffolding. Nothing here parses an archive yet.</p>
      <p>
        Build <code>{__GIT_HASH__}</code>
      </p>
    </main>
  );
}
