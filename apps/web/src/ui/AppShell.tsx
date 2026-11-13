import type { JSX, ReactNode } from "react";

import { Sidebar } from "./Sidebar.js";
import { ThemeSwitch } from "./ThemeSwitch.js";

/**
 * The frame every route lives in: skip link, the persistent sidebar, one main
 * landmark, the honest footer.
 *
 * The sidebar is the app's navigation on every route (D1); each page owns its own
 * h1 so the document has exactly one and the order never skips a level.
 */
export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <Sidebar />

      <div className="app-content">
        <div className="app-tools">
          <ThemeSwitch />
        </div>

        <main id="main" tabIndex={-1} className="app-main">
          {children}
        </main>

        <footer className="app-footer">
          <p>
            Everything here is read from this device. Nothing is uploaded, there is no account and
            no server.
          </p>
        </footer>
      </div>
    </div>
  );
}
