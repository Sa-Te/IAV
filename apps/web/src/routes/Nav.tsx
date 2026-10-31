import { toMediaItems } from "@instavault/core";
import { useEffect, useState, type JSX } from "react";
import { NavLink } from "react-router-dom";

import { useArchiveRepository } from "../repository/RepositoryContext.js";

/**
 * The category nav. It computes its own counts from the repository, so it works
 * on every route (the shell renders it, not the page) and there is no prop to
 * forget. `Everything` is every category's media flattened, which is what `/`
 * shows.
 *
 * Five entries, plus "All categories": a nav with 72 links is a sitemap, not
 * navigation.
 */
const ENTRIES: readonly { path: string; category: string; label: string }[] = [
  { path: "/posts", category: "posts", label: "Posts" },
  { path: "/stories", category: "stories", label: "Stories" },
  { path: "/archived", category: "archived_posts", label: "Archived" },
];

export function Nav(): JSX.Element {
  const repository = useArchiveRepository();
  const [counts, setCounts] = useState<Readonly<Record<string, number>>>({});

  useEffect(() => {
    let cancelled = false;
    void repository
      .listCategories()
      .then((records) => {
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const record of records) {
          next[record.id] = toMediaItems(record.id, record.data).length;
        }
        setCounts(next);
      })
      .catch(() => {
        /* a nav without counts is still usable; the page will report the failure */
      });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const visible = ENTRIES.filter((entry) => (counts[entry.category] ?? 0) > 0);

  return (
    <nav aria-label="Categories" className="nav">
      <NavLink to="/" end className="nav-link">
        Everything <span className="nav-count">{total}</span>
      </NavLink>
      {visible.map((entry) => (
        <NavLink key={entry.path} to={entry.path} className="nav-link">
          {entry.label} <span className="nav-count">{counts[entry.category]}</span>
        </NavLink>
      ))}
      <NavLink to="/categories" className="nav-link">
        All categories
      </NavLink>
      <NavLink to="/cyclone" className="nav-link">
        Cyclone
      </NavLink>
    </nav>
  );
}
