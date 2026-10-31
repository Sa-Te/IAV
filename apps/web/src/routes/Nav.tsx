import type { JSX } from "react";
import { NavLink } from "react-router-dom";

/**
 * Categories that have a route and at least one media item. A category with no
 * media is not shown; a category with no route (messages, profile photo) is
 * reachable through "Everything" but is not a nav entry yet.
 */
const CATEGORIES: readonly { path: string; category: string; label: string }[] = [
  { path: "/posts", category: "posts", label: "Posts" },
  { path: "/stories", category: "stories", label: "Stories" },
  { path: "/archived", category: "archived_posts", label: "Archived" },
];

export function Nav({ counts }: { counts: Readonly<Record<string, number>> }): JSX.Element {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const visible = CATEGORIES.filter((entry) => (counts[entry.category] ?? 0) > 0);

  return (
    <nav aria-label="Categories" className="nav">
      {/* NavLink marks the current route itself; one source of truth, not two. */}
      <NavLink to="/" end className="nav-link">
        Everything <span className="nav-count">{total}</span>
      </NavLink>
      {visible.map((entry) => (
        <NavLink key={entry.path} to={entry.path} className="nav-link">
          {entry.label} <span className="nav-count">{counts[entry.category]}</span>
        </NavLink>
      ))}
      {/* One entry for every parsed category, not 72 links. */}
      <NavLink to="/categories" className="nav-link">
        All categories
      </NavLink>
    </nav>
  );
}
