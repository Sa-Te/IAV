import { lazy, Suspense, type ComponentType, type JSX } from "react";

import { CategoryIndex } from "../categories/CategoryIndex.js";
import { State } from "../ui/State.js";
import { CategoryRoute } from "../categories/CategoryView.js";
import { TierPage } from "./TierPage.js";
import { CategoryGallery } from "./CategoryGallery.js";
import { ConnectionsPage } from "./ConnectionsPage.js";

/** Its own chunk: the GL code must not sit in the initial download. */
const LazyCyclone = lazy(async () => {
  const module = await import("../cyclone/CyclonePage.js");
  return { default: module.CyclonePage };
});

export interface AppRoute {
  readonly path: string;
  readonly element: JSX.Element;
}

function devElement(loader: () => Promise<{ default: ComponentType }>): JSX.Element {
  const Lazy = lazy(loader);
  return (
    <Suspense fallback={<State kind="loading" message="Loading the dev view…" />}>
      <Lazy />
    </Suspense>
  );
}

/**
 * The route table. Dev routes are gated twice: by the caller's `dev` flag and by
 * `import.meta.env.DEV`. The second gate is what removes the imports from a
 * production build; the modules are dynamic imports inside the dead branch, so the
 * manifest has no `/dev/*` entry and the router has no `/dev/*` path.
 */
export function buildRoutes(dev: boolean): readonly AppRoute[] {
  const routes: AppRoute[] = [
    { path: "/", element: <CategoryGallery category="all" title="Everything" /> },
    { path: "/posts", element: <CategoryGallery category="posts" title="Posts" /> },
    { path: "/stories", element: <CategoryGallery category="stories" title="Stories" /> },
    {
      path: "/archived",
      element: <CategoryGallery category="archived_posts" title="Archived posts" />,
    },
    {
      path: "/cyclone",
      element: (
        <Suspense fallback={<State kind="loading" message="Loading the 3D view…" />}>
          <LazyCyclone />
        </Suspense>
      ),
    },
    { path: "/categories", element: <CategoryIndex /> },
    { path: "/connections", element: <ConnectionsPage /> },
    { path: "/categories/:id", element: <CategoryRoute /> },
    { path: "/tiers/:tier", element: <TierPage /> },
  ];

  if (dev && import.meta.env.DEV) {
    routes.push({
      path: "/dev/ingest",
      element: devElement(async () => {
        const module = await import("./DevIngest.js");
        return { default: module.DevIngest };
      }),
    });
    routes.push({
      path: "/dev/tokens",
      element: devElement(async () => {
        const module = await import("./DevTokens.js");
        return { default: module.DevTokens };
      }),
    });
    routes.push({
      path: "/dev/media-audit",
      element: devElement(async () => {
        const module = await import("./DevMediaAudit.js");
        return { default: module.DevMediaAudit };
      }),
    });
    routes.push({
      path: "/dev/logs",
      element: devElement(async () => {
        const module = await import("./DevLogs.js");
        return { default: module.DevLogs };
      }),
    });
    routes.push({
      path: "/dev/cyclone-stats",
      element: devElement(async () => {
        const module = await import("./DevCycloneStats.js");
        return { default: module.DevCycloneStats };
      }),
    });
  }

  return routes;
}
