import { CATEGORIES, toMediaItems, toTableView } from "@instavault/core";
import { useEffect, useState, type JSX } from "react";

import { useArchiveRepository } from "../repository/RepositoryContext.js";

/**
 * `/categories` — every registry row, grouped by privacy tier.
 *
 * This is infrastructure, not the visual pass: semantic tables, no framework.
 * A category that is not in the current export is shown greyed with "not in this
 * export" and no link, because ADR 0002 says absence is a normal state; hiding the
 * row would make an ordinary export look broken.
 */

const TIERS: readonly { readonly tier: 1 | 2 | 3 | 4 | 5; readonly heading: string }[] = [
  { tier: 1, heading: "T1 — settings and mechanics" },
  { tier: 2, heading: "T2 — your own behaviour and security history" },
  { tier: 3, heading: "T3 — your own media and content" },
  { tier: 4, heading: "T4 — third-party identities" },
  { tier: 5, heading: "T5 — third-party authored text" },
];

/** Categories whose generic route renders a purpose-built panel, not a table/tree. */
const THREAD_CATEGORIES = new Set(["messages_inbox", "messages_requests"]);

/** Categories that already have a dedicated route; the index links there instead. */
const DEDICATED: Readonly<Record<string, string>> = {
  posts: "/posts",
  stories: "/stories",
  archived_posts: "/archived",
};

type State =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "ready" };

interface Row {
  readonly id: string;
  readonly label: string;
  readonly tier: 1 | 2 | 3 | 4 | 5;
  readonly present: boolean;
  readonly entries: number;
  readonly media: number;
  readonly files: number;
  readonly view: "gallery" | "table" | "raw tree" | "thread list" | "—";
  readonly href: string | null;
}

export function CategoryIndex(): JSX.Element {
  const repository = useArchiveRepository();
  const [state, setState] = useState<State>({ status: "loading" });
  const [rows, setRows] = useState<readonly Row[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const records = await repository.listCategories();
        const byId = new Map(records.map((record) => [record.id, record]));
        if (cancelled) return;

        const nextRows = CATEGORIES.filter((category) => category.id !== "unrecognised").map(
          (category): Row => {
            const record = byId.get(category.id);
            if (record === undefined) {
              return {
                id: category.id,
                label: category.label,
                tier: category.privacyTier,
                present: false,
                entries: 0,
                media: 0,
                files: 0,
                view: "—",
                href: null,
              };
            }
            // ponytail: the index builds each view only to learn its kind. 72
            // categories, largest 42k rows, once per page — if a profile ever
            // shows this, add a kind probe beside toTableView instead.
            const view = toTableView(record);
            const media = toMediaItems(category.id, record.data).length;
            return {
              id: category.id,
              label: category.label,
              tier: category.privacyTier,
              present: true,
              // A single-envelope object counts as one row in the view even when
              // the stored entryCount (array children) is 0, so show what the
              // viewer will see.
              entries: view.kind === "table" ? view.total : record.entryCount,
              media,
              files: record.sources?.length ?? 1,
              view:
                DEDICATED[category.id] !== undefined
                  ? "gallery"
                  : THREAD_CATEGORIES.has(category.id)
                    ? "thread list"
                    : view.kind === "table"
                      ? "table"
                      : "raw tree",
              href: DEDICATED[category.id] ?? `/categories/${encodeURIComponent(category.id)}`,
            };
          },
        );
        setRows(nextRows);
        setState({ status: "ready" });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "failed",
            message: error instanceof Error ? error.message : "The categories could not be read.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repository]);

  const present = rows.filter((row) => row.present).length;

  return (
    <div className="gallery">
      <h1>All categories</h1>

      {state.status === "loading" && <p role="status">Reading the archive…</p>}

      {state.status === "failed" && (
        <div role="alert" className="state state-error">
          <p>{state.message}</p>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <p className="summary">
            {present} of {rows.length} categories are in this export.
          </p>

          {TIERS.map((group) => {
            const groupRows = rows.filter((row) => row.tier === group.tier);
            return (
              <section key={group.tier} aria-labelledby={`tier-${group.tier}`}>
                <h2 id={`tier-${group.tier}`}>{group.heading}</h2>
                <table>
                  <caption>{groupRows.length} categories</caption>
                  <thead>
                    <tr>
                      <th scope="col">Category</th>
                      <th scope="col">Entries</th>
                      <th scope="col">Media</th>
                      <th scope="col">View</th>
                      <th scope="col">Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.map((row) => (
                      <tr key={row.id} className={row.present ? undefined : "absent"}>
                        <td>
                          {row.href === null ? (
                            <span>{row.label}</span>
                          ) : (
                            <a href={row.href}>{row.label}</a>
                          )}
                        </td>
                        <td>{row.present ? row.entries : "—"}</td>
                        <td>{row.media > 0 ? row.media : ""}</td>
                        <td>{row.present ? row.view : <em>not in this export</em>}</td>
                        <td>{row.files > 1 ? row.files : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
