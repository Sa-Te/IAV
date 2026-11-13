import { useParams } from "react-router-dom";
import type { JSX } from "react";
import { Link } from "react-router-dom";

import {
  splitPresent,
  TIERS,
  useCategoryRows,
  type CategoryRow,
  type Tier,
} from "../categories/useCategoryRows.js";
import { describeCounts } from "../categories/counts.js";
import { State } from "../ui/State.js";

/**
 * `/tiers/t1` … `/tiers/t5` — one page of category cards for a tier.
 *
 * Present categories first as links, absent ones after them in their own group:
 * "not in this export" is a normal state (ADR 0002), but it must never be
 * interleaved with what the person actually has (D3).
 */

/** The route segment is `t1`…`t5`; the number is what the registry speaks. */
function tierOf(value: string | undefined): Tier | null {
  const match = /^t([1-5])$/.exec(value ?? "");
  return match === null ? null : (Number(match[1]) as Tier);
}

function Card({ row }: { row: CategoryRow }): JSX.Element {
  const meta = row.present ? describeCounts(row) : "not in this export";
  const body = (
    <>
      <span className="category-card-tile" aria-hidden="true" />
      <span className="category-card-body">
        <span className="category-card-name">{row.label}</span>
        {meta !== null && <span className="category-card-meta">{meta}</span>}
      </span>
    </>
  );

  return row.href === null ? (
    <li className="category-card is-absent">{body}</li>
  ) : (
    <li className="category-card">
      <Link to={row.href} className="category-card-link">
        {body}
      </Link>
    </li>
  );
}

export function TierPage(): JSX.Element {
  const { tier } = useParams();
  const rows = useCategoryRows();
  const tierNumber = tierOf(tier);
  const group = TIERS.find((entry) => entry.tier === tierNumber);

  if (tierNumber === null || group === undefined) {
    return (
      <div className="gallery">
        <h1>Tier not found</h1>
        <State kind="error" message="There is no tier with that number." />
      </div>
    );
  }

  const catalogue =
    rows.status === "ready" ? rows.rows.filter((row) => row.tier === group.tier) : [];
  const { present, absent } = splitPresent(catalogue);

  return (
    <div className="gallery">
      <h1>
        T{group.tier} — {group.name}
      </h1>
      <p className="summary">{group.description}</p>

      {rows.status === "loading" && <State kind="loading" message="Reading the archive…" />}
      {rows.status === "failed" && <State kind="error" message={rows.message} />}

      {rows.status === "ready" && (
        <>
          <h2>In this export ({present.length})</h2>
          {present.length === 0 ? (
            <State kind="empty" message="No category from this tier is in this export." />
          ) : (
            <ul className="category-card-grid">
              {present.map((row) => (
                <Card key={row.id} row={row} />
              ))}
            </ul>
          )}

          {absent.length > 0 && (
            <>
              <h2>Not in this export ({absent.length})</h2>
              <ul className="category-card-grid">
                {absent.map((row) => (
                  <Card key={row.id} row={row} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
