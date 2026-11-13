import { CATEGORIES, toMediaItems, toTableView, type CategoryViewData } from "@instavault/core";
import { useEffect, useState } from "react";

import { useArchiveRepository } from "../repository/RepositoryContext.js";

/**
 * The registry joined to the repository: every category the app knows about, with
 * what this export actually contains.
 *
 * One hook, because three views ask the same question — the sidebar's tier
 * disclosures, the tier pages, and the `/categories` overview. A registry alone
 * renders an empty page when the repository returns nothing; a repository alone
 * hides categories the export simply lacks, which ADR 0002 says is a normal state.
 */

export type Tier = 1 | 2 | 3 | 4 | 5;

export interface TierGroup {
  readonly tier: Tier;
  /** Short name for the sidebar and headings. */
  readonly name: string;
  /** What the tier means, from ADR 0002. */
  readonly description: string;
}

export const TIERS: readonly TierGroup[] = [
  { tier: 1, name: "Settings & mechanics", description: "How the account is configured." },
  { tier: 2, name: "Your behaviour", description: "What you did, and your security history." },
  { tier: 3, name: "Your content", description: "Your own media and posts." },
  { tier: 4, name: "Other people", description: "Third-party identities you interacted with." },
  { tier: 5, name: "Their words", description: "Text written by other people." },
];

/** Categories that already have a dedicated route; everything else uses /categories/:id. */
const DEDICATED: Readonly<Record<string, string>> = {
  posts: "/posts",
  stories: "/stories",
  archived_posts: "/archived",
};

export interface CategoryRow {
  readonly id: string;
  readonly label: string;
  readonly tier: Tier;
  readonly present: boolean;
  readonly entries: number;
  readonly media: number;
  readonly href: string | null;
}

export type CategoryRows =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "ready"; readonly rows: readonly CategoryRow[] };

export function useCategoryRows(): CategoryRows {
  const repository = useArchiveRepository();
  const [state, setState] = useState<CategoryRows>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const records = await repository.listCategories();
        const byId = new Map(records.map((record) => [record.id, record]));
        if (cancelled) return;

        const rows = CATEGORIES.filter((category) => category.id !== "unrecognised").map(
          (category): CategoryRow => {
            const record = byId.get(category.id);
            if (record === undefined) {
              return {
                id: category.id,
                label: category.label,
                tier: category.privacyTier,
                present: false,
                entries: 0,
                media: 0,
                href: null,
              };
            }
            // One unreadable record must not take the page with it: a stale or
            // malformed row degrades to "present, no counts" rather than a throw.
            let view: CategoryViewData;
            let media = 0;
            try {
              view = toTableView(record);
              media = toMediaItems(category.id, record.data).length;
            } catch {
              view = { kind: "tree", value: null };
            }
            return {
              id: category.id,
              label: category.label,
              tier: category.privacyTier,
              present: true,
              // A single-envelope object counts as one row in the view even when the
              // stored entryCount is 0, so show what the viewer will see.
              entries: view.kind === "table" ? view.total : record.entryCount,
              media,
              href: DEDICATED[category.id] ?? `/categories/${encodeURIComponent(category.id)}`,
            };
          },
        );

        setState({ status: "ready", rows });
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

  return state;
}

/** Present rows first, absent ones after — never interleaved (D3). */
export function splitPresent(rows: readonly CategoryRow[]): {
  readonly present: readonly CategoryRow[];
  readonly absent: readonly CategoryRow[];
} {
  return {
    present: rows.filter((row) => row.present),
    absent: rows.filter((row) => !row.present),
  };
}
