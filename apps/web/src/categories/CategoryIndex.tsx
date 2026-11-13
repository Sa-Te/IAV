import type { JSX } from "react";
import { Link } from "react-router-dom";

import { TIERS, useCategoryRows } from "./useCategoryRows.js";
import { State } from "../ui/State.js";

/**
 * `/categories` — an overview of the five tiers, not a 86-row table.
 *
 * Nobody scans a directory of every category (M18's report: "no people would go
 * and look into it like this"); the tiers are the way in, each leading to its own
 * page of cards. The per-category route is unchanged.
 */
export function CategoryIndex(): JSX.Element {
  const rows = useCategoryRows();
  const catalogue = rows.status === "ready" ? rows.rows : [];

  return (
    <div className="gallery">
      <h1>Categories</h1>
      <p className="summary">
        Instagram's export is organised here by what the data is: five tiers, from account settings
        to other people's words.
      </p>

      {rows.status === "loading" && <State kind="loading" message="Reading the archive…" />}
      {rows.status === "failed" && <State kind="error" message={rows.message} />}

      {rows.status === "ready" && (
        <ul className="tier-overview">
          {TIERS.map((group) => {
            const tierRows = catalogue.filter((row) => row.tier === group.tier);
            const present = tierRows.filter((row) => row.present).length;
            return (
              <li key={group.tier}>
                <Link to={`/tiers/t${group.tier}`} className="tier-overview-link">
                  <span className="tier-overview-name">
                    T{group.tier} — {group.name}
                  </span>
                  <span className="tier-overview-meta">
                    {present} of {tierRows.length} in this export
                  </span>
                  <span className="tier-overview-description">{group.description}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
