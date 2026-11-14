import { lazy, Suspense, type JSX } from "react";

import { CategoryIndex } from "../categories/CategoryIndex.js";
import { State } from "../ui/State.js";
import { CategoryRoute } from "../categories/CategoryView.js";
import { TierPage } from "./TierPage.js";
import { CategoryGallery } from "./CategoryGallery.js";
import { ConnectionsPage } from "./ConnectionsPage.js";
import { DevIngest } from "./DevIngest.js";
import { DevLogs } from "./DevLogs.js";
import { DevMediaAudit } from "./DevMediaAudit.js";
import { DevTokens } from "./DevTokens.js";

/** Its own chunk: the GL code must not sit in the initial download. */
/** Dev-only, but still lazy: it imports the GL module, which must not enter the entry chunk. */
const LazyDevCycloneStats = lazy(async () => {
  const module = await import("./DevCycloneStats.js");
  return { default: module.DevCycloneStats };
});

const LazyCyclone = lazy(async () => {
  const module = await import("../cyclone/CyclonePage.js");
  return { default: module.CyclonePage };
});

export interface AppRoute {
  readonly path: string;
  readonly element: JSX.Element;
}

/**
 * The route table. The dev harness exists only when `dev` is true, which the app
 * passes as `import.meta.env.DEV` — in a production build the route is not in the
 * table at all, not merely hidden.
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

  if (dev) {
    routes.push({ path: "/dev/ingest", element: <DevIngest /> });
    routes.push({ path: "/dev/tokens", element: <DevTokens /> });
    routes.push({ path: "/dev/media-audit", element: <DevMediaAudit /> });
    routes.push({ path: "/dev/logs", element: <DevLogs /> });
    routes.push({
      path: "/dev/cyclone-stats",
      element: (
        <Suspense fallback={<State kind="loading" message="Loading the stats view…" />}>
          <LazyDevCycloneStats />
        </Suspense>
      ),
    });
  }

  return routes;
}
