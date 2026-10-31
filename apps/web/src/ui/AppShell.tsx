import type { JSX, ReactNode } from "react";
import { Link } from "react-router-dom";

import { Nav } from "../routes/Nav.js";
import { ThemeSwitch } from "./ThemeSwitch.js";

/**
 * The frame every route lives in: skip link, header, one main landmark, footer.
 *
 * The wordmark is the only <h1>-free header element; each page owns its own <h1>
 * so the document has exactly one and the order never skips a level.
 */
export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="app-header">
        <Link to="/" className="wordmark">
          InstaVault
        </Link>
        <Nav />
        <ThemeSwitch />
      </header>

      <main id="main" tabIndex={-1} className="app-main">
        {children}
      </main>

      <footer className="app-footer">
        <p>
          Everything here is read from this device. Nothing is uploaded, there is no account and no
          server.
        </p>
      </footer>
    </>
  );
}
