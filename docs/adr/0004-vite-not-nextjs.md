# 0004 — Vite + React Router, not Next.js

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** project owner
- **Supersedes:** the "Next.js 15 (App Router)" line in AGENTS.md §2
- **Relates to:** ADR 0001

## Context

AGENTS.md §2 specified Next.js. v1 (ADR 0001) is a fully client-side app: no
server, no API routes, no server components, no database. Next's value is server
rendering, file-based routing and server-side data loading — none of which v1
uses.

Shipping it as a static export adds constraints that exist only to satisfy the
framework: dynamic routes need `generateStaticParams`, images go through a
component that must be told not to optimise, and the router has to be understood
as a build-time map rather than a runtime library. On top of that, the runtime
is heavier than the app needs, and every one of those grams is downloaded by
someone opening their private archive.

## Options considered

1. **Next.js static export.** Keeps the original plan and the frozen
   `reference-frontend/` codebase familiar. Rejected: it carries routing and
   rendering machinery v1 does not use, and its static-export mode has sharp
   edges for dynamic routes we may want later (thread ids, media ids).
2. **Vite + React Router.** Chosen.

## Decision

The build tool is **Vite**, the router is **react-router-dom**. The output is a
plain static folder (`apps/web/dist`) that can be served by any file server,
opened behind a service worker, or wrapped by Tauri without changes.

Web Workers, WebGL and `OffscreenCanvas` are first-class in Vite: `new Worker(new
URL('./worker.ts', import.meta.url), { type: 'module' })` works in dev and in the
build without framework plugins.

## Consequences

- **`reference-frontend/` is Next.js and stays frozen.** Components are ported
  manually into `apps/web`. Nothing under `apps/` or `packages/` may import from
  `reference-frontend/`, exactly as for `reference-backend/`.
- **Routing is react-router-dom.** Every route is a client route. There is no
  `app/` directory, no layout server boundary, no route handler.
- **No server components, ever.** This is now a structural property of the build,
  not a rule someone has to remember: Vite has no server rendering to reach for.
- **Tauri later is a wrapper.** The same `dist/` drops into the Tauri shell; no
  second build pipeline.
- `docs/ARCHITECTURE.md` and the AGENTS.md folder tree are updated to match.
