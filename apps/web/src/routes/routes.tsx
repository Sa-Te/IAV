import type { JSX } from "react";

import { CategoryIndex } from "../categories/CategoryIndex.js";
import { CategoryRoute } from "../categories/CategoryView.js";
import { CategoryGallery } from "./CategoryGallery.js";
import { DevIngest } from "./DevIngest.js";

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
    { path: "/categories", element: <CategoryIndex /> },
    { path: "/categories/:id", element: <CategoryRoute /> },
  ];

  if (dev) {
    routes.push({ path: "/dev/ingest", element: <DevIngest /> });
  }

  return routes;
}
