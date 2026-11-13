import { useState, type JSX, type ReactNode } from "react";

import { Sidebar } from "./Sidebar.js";
import { ThemeSwitch } from "./ThemeSwitch.js";

/** UI state only, which is all localStorage is allowed to hold (AGENTS.md §1.3). */
const SIDEBAR_KEY = "instavault-sidebar";

/**
 * The frame every route lives in: skip link, the persistent sidebar, one main
 * landmark, the honest footer.
 *
 * The sidebar is the app's navigation on every route (D1); each page owns its own
 * h1 so the document has exactly one and the order never skips a level.
 */
export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const [collapsed, setCollapsed] = useState(
    () => globalThis.localStorage?.getItem(SIDEBAR_KEY) === "closed",
  );

  const toggle = (): void => {
    setCollapsed((value) => {
      const next = !value;
      try {
        globalThis.localStorage?.setItem(SIDEBAR_KEY, next ? "closed" : "open");
      } catch {
        /* storage blocked: the choice lasts this session */
      }
      return next;
    });
  };

  return (
    <div className="app-shell" data-sidebar={collapsed ? "closed" : "open"}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <Sidebar collapsed={collapsed} onCollapse={toggle} />

      <div className="app-content">
        <div className="app-tools">
          {collapsed && (
            <button
              type="button"
              className="button sidebar-open"
              aria-expanded="false"
              aria-controls="sidebar"
              onClick={toggle}
            >
              Show sidebar
            </button>
          )}
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
