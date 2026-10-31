import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./styles/app.css";
import { App } from "./App.js";
import { RepositoryProvider } from "./repository/RepositoryContext.js";
import { DevIngest } from "./routes/DevIngest.js";
import { Gallery } from "./routes/Gallery.js";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing #root element in index.html");
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RepositoryProvider>
              <Gallery />
            </RepositoryProvider>
          }
        />
        <Route path="/dev/ingest" element={<DevIngest />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
