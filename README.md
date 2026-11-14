# InstaVault

Turns an Instagram data export ZIP into a browsable gallery.

Instagram lets you download everything it holds about you as a ZIP full of JSON
files and media. There is no way to look at any of it. This project parses that
ZIP and shows it back to you.

## Status

**Pre-alpha, browser-only.** The import path works end to end: a ZIP is parsed in
a worker, stored in IndexedDB, and rendered through galleries, a 3D cyclone and
per-category screens. T1, T2, T3 and T4 now have screens: T1 settings, the avatar
grid and the device profile; T2 event/activity lists, settings, a profile with its
local photo, and the name/place lists; T3's fourteen activity and comment lists,
plus three media galleries; T4's twelve person lists, its tag list and its gated
contact table. Long lists fold by year and then month; three T3 comment categories
and T4's synced contacts ask before they render because they hold other people's
words or contact details. T5 still renders through the generic table or raw tree.
There is no server, no account and no network egress.

## What v1 is

v1 is designed to be a **browser-only, static web app**:

- no server and no backend process;
- no accounts, no sign-in, no database;
- the ZIP is opened and parsed in a Web Worker inside the tab, and the extracted
  records and media are stored in IndexedDB on your device;
- nothing is uploaded, and the build contains no analytics, telemetry, remote
  fonts or runtime CDN assets.

This is the design recorded in [AGENTS.md](AGENTS.md) §1 and
[docs/adr/0001-browser-only-v1.md](docs/adr/0001-browser-only-v1.md). It is a
specification for work that has not happened yet, not a description of current
behaviour. The previously shipped version was a Go + Postgres app that uploaded
the whole archive to a server; it is kept, unmodified and unbuilt, in
`reference-backend/` as a specification for what an Instagram export contains.

## Stack

Installed:

- Vite + React 19 + react-router-dom, TypeScript in `strict` mode
  (ADR [0004](docs/adr/0004-vite-not-nextjs.md); Next.js appears only in
  `reference-frontend/` and is never imported)
- IndexedDB for archive records and media blobs; a Web Worker for parsing
- Hand-written WebGL2 for the optional 3D view — no Three.js dependency
- Vitest for tests, pnpm as the only package manager

## Building it

Requires Node 22 (see `.nvmrc`) and pnpm.

```bash
pnpm install        # also installs the pre-push hook
pnpm dev            # Vite dev server
pnpm build          # static build in apps/web/dist
pnpm test           # unit + integration tests
pnpm verify         # everything CI runs, locally
pnpm test:e2e       # the browser lane (see below)
```

## The browser lane

`pnpm test:e2e` runs Playwright against the **built** app, served by
`vite preview` on `127.0.0.1:4173`, and imports a synthetic export generated into
a temp directory — no real archive, no network.

```bash
pnpm exec playwright install chromium   # once, if the pinned build is missing
pnpm test:e2e                           # typecheck the specs, then run them
pnpm test:e2e --repeat-each 3           # pass playwright flags through
```

It is deliberately not part of `pnpm verify`: the 20-second gate stays a
20-second gate (AGENTS.md §9). A failing run keeps its trace under
`test-results/`; `pnpm exec playwright show-trace test-results/.../trace.zip`
opens it.

What CI cannot verify: a runner has no GPU, so the lane asserts which branch the
device's own WebGL2 capability probe dictates — never that the vortex renders.
Frame rate, resident texture bytes and the one-draw-call claim are a human check
with `/dev/cyclone-stats`.

## Try it

```bash
pnpm install
pnpm dev
# open http://localhost:5173/
```

You need an Instagram export ZIP (request it as **JSON**, not HTML).

1. Open `/dev/ingest` and drop the ZIP in. It parses in a Web Worker and writes
   categories and media to IndexedDB on this device. You should see
   `reading → resolving → storing`, then a summary: categories, entries,
   media stored, media missing, unrecognised files, and a shape fingerprint.
2. Open `/` for everything, `/posts`, `/stories`, `/archived` for one gallery,
   `/cyclone` for the 3D view, and `/categories` or `/tiers/t1` … `/tiers/t5` for
   the archive's categories, grouped by the privacy tier they belong to. The
   sidebar is the way around all of it. T1's settings categories open as labelled
   fields rather than a table; avatar items open as a grid of placeholders because
   their images are remote URLs the app never fetches; device camera effects open
   as one profile with its records. Long lists group by month and day, and by year
   first when they span more than two years — 42,197 liked posts are twelve year
   rows, not 121 month buttons. A profile photo is shown from the local blob, and a
   post URL is a real link the app never fetches. A story reaction links to the
   story it reacted to; an emoji slider shows the colours it was drawn with, and a
   poll its options at their own sizes instead of printing hex codes and font
   sizes. Saved posts are grouped by the collection they are in, with the ones in
   no collection shown as their own group. T4's people are cards: initials, name,
   @username, the date the export records, and the profile link the export itself
   carries — no avatar is invented because the archive has no profile images.
   The list groups by year and pages 200 at a time. Following hashtags has its own
   tag list because a hashtag is not a person. Synced contacts is a gated table:
   address-book names and phone numbers belong to people who did not choose this
   app, so it asks before it reads them.

**What privacy means in practice.** The ZIP is read with the browser's own file
API, parsed in a worker in the same tab, and stored in IndexedDB. Nothing is
uploaded, there is no server, no analytics, and the page fetches no third-party
asset. You can turn Wi-Fi off after the page loads and everything still works.
"Wipe archive" deletes the archive, every category and every media file in one
transaction.

**The cyclone needs WebGL2.** It shows the archive as a spiral of up to 96 resident
cards; without WebGL2, or with fewer than eight items, or with reduced motion on, it
falls back to the grid and says why rather than showing a dead canvas.

**Two themes, no remote assets.** Umber (dark) and Paper (light) come from one token
file (`packages/tokens`); the switch is in the header and your choice is stored only
on this device. Fonts are self-hosted, and `pnpm check:styles` refuses a raw colour,
an arbitrary utility value or a gradient outside the token file.

**Some categories ask before they show.** Categories that hold other people's words
or contact details render behind a single "Show this category" button, so a route
click on a shared screen does not open someone's conversation: messages, AI
conversations, payment records, synced contacts, and the three comment categories —
the comments other people wrote on your posts and reels, and the comments you liked.
Comments stay on the "your content" page; the gate is not a tier (ADR 0014).
Synced contacts stays on the T4 page; its gate exists because an address-book entry
belongs to someone who has not necessarily used Instagram (ADR 0019). The reveal is
not remembered: reloading the page gates them again.

**Every parsed category has a page.** `/categories` lists all of them by privacy
tier; a category whose shape carries no labels renders as a collapsible JSON tree
behind a banner that says so: that category is stored exactly as Instagram
provided it, and nothing has been interpreted.

**If something is wrong.** A tile that shows a dashed red box is media the archive
references but does not contain — the archive itself is fine, that file is absent.
A tile with a striped grey box is still loading; it will not stay that way.

## Handling a new export

Instagram changes the shape of its export without warning. Two exports of the same
account can disagree about a file's structure while agreeing about its name, so
"it still opens" is not evidence that nothing moved.

**`archive-2/` is the current baseline.** It is the export the registry was last
measured against, and it is gitignored. `archive/` (the older export) stays on
disk only as the drift reference and is never imported again.

When a new export arrives:

```bash
# 1. Extract it into its own directory. Never overwrite the baseline.
unzip ~/Downloads/instagram-<user>.zip -d archive-3/

# 2. Compare it with the export the registry was measured against.
pnpm drift archive-2/ archive-3/
#    Prints a summary and writes docs/DRIFT-<today>.md — structure only: ids, key
#    names, counts, fingerprints. No captions, no usernames, no filenames. Read it.

# 3. For each file the report lists as unrecognised, ask what it would need:
pnpm drift --propose archive-3/ <basename>
#    Prints a registry row, a schema skeleton, a synthetic fixture and a DATA-MAP
#    row. It never writes a file — the paste is a human decision.

# 4. Promote what you accept (registry row, schema, parser, fixtures, tests,
#    DATA-MAP row), then re-import and confirm the numbers:
pnpm ingest:report archive-3/
#    Expect: unrecognised 0, mediaMissing 0, and orphans 0 or an explanation.
```

A changed shape is **more** signatures on the existing row, never a looser one
(ADR 0008). A category that is absent from the new export is normal, not an error:
mark it, do not delete it (ADR 0002).

## Local gates

The repository enforces its own rules; they are not conventions to remember.

- **One command, one meaning.** The pre-push hook (`.githooks/pre-push`,
  installed by `pnpm install` through `git config core.hooksPath .githooks`) and
  CI both run exactly `pnpm verify`. There is no separate "fast lane" list to
  keep in sync — two lists drift, and the drift is invisible until a push fails.
- **`pnpm verify`** runs typecheck, lint, format check, unit + integration tests,
  the boundary check, the file-size check and the build.
- **`pnpm check:boundaries`** fails if `packages/core` or `packages/storage`
  import React, reach into `apps/`, touch the network, or escape their package.
- **`pnpm check:filesize`** warns above 250 lines and fails above 400.
- **`pnpm ci:status`** prints the latest CI run for your commit, or the manual
  `gh` commands if `gh` is unavailable.

**The one residual gap:** the hook cannot cheaply detect a stale lockfile. CI
installs with `--frozen-lockfile` and will fail if `package.json` and
`pnpm-lock.yaml` disagree; a local `pnpm install` silently rewrites the lockfile
instead. So after any dependency change, run `pnpm ci:status` once the push
lands — that check is the safety net, not the hook.

Do not bypass the hook with `--no-verify` to get past a real failure. If it is
too slow, cut scope instead.

## Contributing

Read [AGENTS.md](AGENTS.md) first. It is the contract for every change, and it
is written for both humans and coding agents.

## Licence

AGPL-3.0. See [LICENSE](LICENSE). If you run a modified version as a network
service, section 13 of the licence requires you to offer its source.
