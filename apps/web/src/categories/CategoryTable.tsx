import { PAGE_SIZE, type TableView } from "@instavault/core";
import { useMemo, useState, type JSX } from "react";

import { State } from "../ui/State.js";

/**
 * 100 rows per page (AGENTS.md §7). Pagination, not virtualisation: the largest
 * category in the measured archive is 42,197 rows, which is a page-count problem,
 * not a rendering problem. The whole table is in memory either way; only the
 * visible slice is in the DOM.
 */

function truncate(text: string): string {
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function CategoryTable({
  view,
  caption,
}: {
  view: TableView;
  caption: string;
}): JSX.Element {
  const [page, setPage] = useState(0);

  // A column is numeric when every non-empty cell looks like a number. Computed
  // once per view: 42,197 rows must not be re-scanned on a page change.
  const numeric = useMemo(
    () =>
      view.columns.map((_, column) =>
        view.rows.every((row) => {
          const text = row[column]?.text ?? "";
          return text === "" || /^-?\d+([.,]\d+)?$/.test(text);
        }),
      ),
    [view],
  );
  const pages = Math.max(1, Math.ceil(view.total / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const rows = view.rows.slice(start, start + PAGE_SIZE);
  const end = Math.min(start + PAGE_SIZE, view.total);

  return (
    <div className="category-table">
      <table>
        <caption>
          {caption} — {view.total} {view.total === 1 ? "row" : "rows"}
        </caption>
        <thead>
          <tr>
            {view.columns.map((column, columnIndex) => (
              <th
                key={column}
                scope="col"
                className={numeric[columnIndex] === true ? "tabular" : undefined}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={start + rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={view.columns[cellIndex] ?? cellIndex}
                  className={numeric[cellIndex] === true ? "tabular" : undefined}
                >
                  {/* The full value is always in `title`; the visible text is cut
                      for layout only. Nothing is paraphrased. */}
                  <span title={cell.title ?? cell.text}>{truncate(cell.text)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {view.total === 0 ? (
        <State kind="empty" message="No rows in this category." />
      ) : (
        <div className="pager">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous page
          </button>
          <p role="status">
            Rows {start + 1}–{end} of {view.total} · page {page + 1} of {pages}
          </p>
          <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
            Next page
          </button>
        </div>
      )}
    </div>
  );
}
