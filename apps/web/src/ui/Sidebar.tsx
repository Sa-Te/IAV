import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { primaryCount } from "../categories/counts.js";
import { splitPresent, TIERS, useCategoryRows, type Tier } from "../categories/useCategoryRows.js";
import { useMediaQuery } from "./useMediaQuery.js";

/**
 * The app's navigation: galleries, then the five privacy tiers.
 *
 * The tiers are disclosures, not a sitemap: 86 category links open at once is a
 * directory nobody reads. The group holding the current route starts expanded; the
 * rest open on request. Under 900px the whole thing is a modal sheet — Escape
 * closes it, Tab stays inside it, and focus goes back to the button that opened it.
 */

const GALLERIES: readonly {
  readonly path: string;
  readonly category: string;
  readonly label: string;
}[] = [
  { path: "/", category: "everything", label: "Everything" },
  { path: "/posts", category: "posts", label: "Posts" },
  { path: "/stories", category: "stories", label: "Stories" },
  { path: "/archived", category: "archived_posts", label: "Archived" },
];

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Sidebar({
  collapsed = false,
  onCollapse,
}: {
  collapsed?: boolean;
  onCollapse?: () => void;
} = {}): JSX.Element {
  const rows = useCategoryRows();
  const compact = useMediaQuery("(max-width: 899px)");
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<readonly Tier[]>([]);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);

  const catalogue = rows.status === "ready" ? rows.rows : [];
  const counts: Record<string, number> = {};
  const byId = new Map(catalogue.map((row) => [row.id, row]));
  for (const row of catalogue) counts[row.id] = row.media;
  const everything = catalogue.reduce((sum, row) => sum + row.media, 0);
  const countOf = (category: string): number =>
    category === "everything" ? everything : (counts[category] ?? 0);
  const reels = byId.get("reels");
  const secretConversations = byId.get("secret_conversations");

  // The tier that owns the current route opens by itself: `/categories/:id` finds
  // its category's tier, `/tiers/tN` is that tier.
  const activeTier: Tier | null = (() => {
    const tierMatch = /^\/tiers\/t(\d)$/.exec(location.pathname);
    if (tierMatch !== null) return Number(tierMatch[1]) as Tier;
    const categoryMatch = /^\/categories\/([^/]+)$/.exec(location.pathname);
    if (categoryMatch === null) return null;
    const id = decodeURIComponent(categoryMatch[1] ?? "");
    return catalogue.find((row) => row.id === id)?.tier ?? null;
  })();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  // Escape closes the sheet, Tab stays inside it. Both only while it is a sheet.
  useEffect(() => {
    if (!open || !compact) return;
    const sheet = sheetRef.current;
    if (sheet === null) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const items = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    sheet.addEventListener("keydown", onKeyDown);
    sheet.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => sheet.removeEventListener("keydown", onKeyDown);
  }, [open, compact, close]);

  const isExpanded = (tier: Tier): boolean => expanded.includes(tier) || activeTier === tier;

  const toggle = (tier: Tier): void => {
    setExpanded((current) =>
      current.includes(tier) ? current.filter((value) => value !== tier) : [...current, tier],
    );
  };

  return (
    <>
      {compact && (
        <button
          ref={toggleRef}
          type="button"
          className="sidebar-toggle"
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen((value) => !value)}
        >
          Menu
        </button>
      )}

      <aside
        id="sidebar"
        ref={sheetRef}
        className={`sidebar${open ? " is-open" : ""}`}
        aria-label="InstaVault"
        role={compact ? "dialog" : undefined}
        aria-modal={compact ? (open ? "true" : undefined) : undefined}
        inert={compact && !open ? true : undefined}
      >
        <div className="sidebar-top">
          <NavLink to="/" end className="wordmark sidebar-wordmark">
            InstaVault
          </NavLink>
          {onCollapse !== undefined && !compact && (
            <button
              type="button"
              className="sidebar-collapse"
              aria-label="Hide the sidebar"
              aria-expanded={!collapsed}
              onClick={onCollapse}
            >
              ‹
            </button>
          )}
        </div>

        <nav aria-label="Galleries" className="sidebar-group">
          <h2 className="sidebar-heading">Galleries</h2>
          <ul className="sidebar-list">
            {GALLERIES.map((entry) => (
              <li key={entry.path}>
                <NavLink to={entry.path} end={entry.path === "/"} className="sidebar-link">
                  {entry.label} <span className="sidebar-count">{countOf(entry.category)}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to="/connections" className="sidebar-link">
                Connections
              </NavLink>
            </li>
            <li>
              <NavLink to="/cyclone" className="sidebar-link">
                Cyclone
              </NavLink>
            </li>
            {/*
              Reels is registered but absent from this export (D2, ADR 0008). It is
              never hidden and never invented: an empty gallery is a normal state,
              and a person who does post reels gets the link when the file exists.
            */}
            <li>
              {reels?.present === true ? (
                <NavLink to={reels.href ?? "/categories/reels"} className="sidebar-link">
                  Reels <span className="sidebar-count">{primaryCount(reels) ?? ""}</span>
                </NavLink>
              ) : (
                <span className="sidebar-muted">
                  <span>Reels</span>{" "}
                  {rows.status === "ready" && (
                    <span className="sidebar-count">no reels in this export</span>
                  )}
                </span>
              )}
            </li>
          </ul>
        </nav>

        <nav aria-label="Categories" className="sidebar-group">
          <h2 className="sidebar-heading">Categories</h2>
          {rows.status === "failed" && <p className="sidebar-note">{rows.message}</p>}
          <ul className="sidebar-list">
            {TIERS.map((group) => {
              const tierRows = catalogue.filter((row) => row.tier === group.tier);
              const { present } = splitPresent(tierRows);
              const open = isExpanded(group.tier);
              return (
                <li key={group.tier}>
                  <button
                    type="button"
                    className="sidebar-disclosure"
                    aria-expanded={open}
                    aria-controls={`tier-panel-${group.tier}`}
                    onClick={() => toggle(group.tier)}
                  >
                    <span>T{group.tier}</span>
                    <span className="sidebar-count">
                      {rows.status === "ready" ? `${group.name} · ${present.length}` : group.name}
                    </span>
                  </button>
                  <div id={`tier-panel-${group.tier}`} hidden={!open}>
                    <ul className="sidebar-list sidebar-sublist">
                      {present.map((row) => {
                        const count = primaryCount(row);
                        return (
                          <li key={row.id}>
                            <NavLink
                              to={row.href ?? `/categories/${row.id}`}
                              className="sidebar-link"
                            >
                              {row.label}
                              {count !== null && (
                                <>
                                  {" "}
                                  <span className="sidebar-count">{count}</span>
                                </>
                              )}
                            </NavLink>
                          </li>
                        );
                      })}
                      {rows.status === "ready" && present.length === 0 && (
                        <li className="sidebar-note">Nothing from this tier here.</li>
                      )}
                      {/*
                        Secret conversations is registered but absent from this
                        export. The same treatment as reels: never hidden, never
                        invented, and a normal link the day the file exists.
                      */}
                      {group.tier === 4 && secretConversations?.present === false && (
                        <li>
                          <span className="sidebar-muted">
                            <span>{secretConversations.label}</span>{" "}
                            <span className="sidebar-count">not in this export</span>
                          </span>
                        </li>
                      )}
                    </ul>
                    <NavLink to={`/tiers/t${group.tier}`} className="sidebar-link sidebar-more">
                      All T{group.tier} categories →
                    </NavLink>
                  </div>
                </li>
              );
            })}
            <li>
              <NavLink to="/categories" className="sidebar-link">
                Category overview
              </NavLink>
            </li>
          </ul>
        </nav>

        <p className="sidebar-footer">
          Read from this device. Nothing is uploaded, no account, no server.
        </p>
      </aside>

      {compact && open && (
        <button type="button" className="sidebar-scrim" aria-label="Close menu" onClick={close} />
      )}
    </>
  );
}
