import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./styles/app.css";
import { MediaCachesProvider } from "./media/MediaCaches.js";
import { AppShell } from "./ui/AppShell.js";
import { RepositoryProvider } from "./repository/RepositoryContext.js";
import { buildRoutes } from "./routes/routes.js";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing #root element in index.html");
}

const routes = buildRoutes(import.meta.env.DEV);

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <RepositoryProvider>
                <MediaCachesProvider>
                  <AppShell>{route.element}</AppShell>
                </MediaCachesProvider>
              </RepositoryProvider>
            }
          />
        ))}
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
