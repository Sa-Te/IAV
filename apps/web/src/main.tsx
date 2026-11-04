import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./styles/app.css";
import { MediaCachesProvider } from "./media/MediaCaches.js";
import { AppShell } from "./ui/AppShell.js";
import { ErrorBoundary } from "./ui/ErrorBoundary.js";
import { installLogCapture } from "./ui/logBuffer.js";
import { RepositoryProvider } from "./repository/RepositoryContext.js";
import { buildRoutes } from "./routes/routes.js";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing #root element in index.html");
}

const routes = buildRoutes(import.meta.env.DEV);

// Before React, before the first request: every console/window failure lands in
// the ring buffer that /dev/logs renders. Dev only — production keeps its console.
const stopLogCapture = import.meta.env.DEV ? installLogCapture() : () => undefined;
void stopLogCapture;

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
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
    </ErrorBoundary>
  </StrictMode>,
);
