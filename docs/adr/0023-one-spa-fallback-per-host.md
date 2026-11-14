# 0023 — One SPA fallback per host, and why the dry run could not see it

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** project owner
- **Relates to:** ADR 0022 (downloads), AGENTS.md §10, M28, M29

## Context

The first real Cloudflare Workers deploy failed after a successful build:

```
✨ Read 22 files from the assets directory /opt/buildhome/repo/apps/web/dist
✘ [ERROR] A request to the Cloudflare API (…/workers/scripts/instavault/versions) failed.
  Invalid _redirects configuration:
  Line 1: Infinite loop detected in this rule. This would cause a redirect to strip `.html`
  or `/index` and end up triggering this rule again. [code: 100324]
```

Two SPA-fallback mechanisms were active at once:

1. `wrangler.jsonc` declared `assets.not_found_handling: "single-page-application"`.
2. Vite copied `apps/web/public/_redirects` into the build, containing
   `/* /index.html 200`.

Workers reads `_redirects` from the assets directory and validates it on the
server. The rule matches `/index.html` through `/*`, Workers canonicalises that to
`/index`, the canonical path matches `/*` again, and the validator rejects the
loop. The catch-all that Pages and Netlify accept is not valid here.

M28 left this exact question open and answered it wrongly: it observed that
`--dry-run` does not tell us whether Workers interprets `_redirects`, and kept the
file "for portability". A dry run builds and lists the assets locally and never
sends `_redirects` to the API, so the failure could only appear on a real deploy.

## Decision

**One fallback mechanism per host, and it is the host's own configuration.**

- **Workers:** `not_found_handling: "single-page-application"` is the only
  mechanism. `_redirects` is deleted from source (`apps/web/public/_redirects`)
  and must not ship in the build. A catch-all `_redirects` alongside
  `not_found_handling` is not belt-and-braces; it is an invalid configuration.
- **Netlify:** `netlify.toml` keeps its `/* → /index.html 200` rule. That is the
  switch for a different host, not a second pipeline; neither host reads the
  other's file.
- **The config file is the single source of truth**, including `NODE_VERSION`:
  the dashboard already had it, the deploy warned it would be dropped, and now the
  file declares `"vars": { "NODE_VERSION": "22" }` so local config and remote
  environment agree by construction.
- **No `main`, no `[build]`.** The deploy is assets only, and Cloudflare's build
  command stays in the dashboard.

## Why the local gate could not catch it

`wrangler deploy --dry-run` reads the directory, reports the files and exits. It
does not send them to the Cloudflare API, so server-side asset validation — which
is where `_redirects` is parsed — never runs. The proof that the file is gone is
the build output, not the dry run: `ls apps/web/dist/_redirects` must fail.

## Options considered

1. **Keep `_redirects` and drop `not_found_handling`.** Rejected: the file is
   rejected as written, and rewriting it into per-route rules reproduces natively
   supported behaviour by hand. The native mechanism is simpler and already
   configured.
2. **Change the `_redirects` rule** (e.g. `/* /index.html 200` → a rewrite
   Worker). Rejected: a Worker script is a second deploy surface for something
   `not_found_handling` does with a flag, and ASSETS-only is the whole design.
3. **Keep both and accept the risk "in case Workers ignores it".** Rejected by
   the real deploy: Workers does not ignore it, it rejects it.
4. **Delete the second mechanism; keep the host-specific one for Netlify.**
   Chosen.

## Consequences

- The deploy path is one mechanism that the API itself validates.
- `netlify.toml` and `wrangler.jsonc` each speak only for their own host; the
  README states both and why the shared file was removed.
- AGENTS §10 now names the rule: a `_redirects` file must never ship alongside
  `not_found_handling`.
- A future host with its own fallback config gets a file for that host, not a file
  in `public/` that every host must tolerate.
- The lesson is structural: a local dry run is not a deploy. For server-side
  validation, the first real deploy is the only test, so choose one mechanism the
  platform validates rather than two the client quietly ships.
