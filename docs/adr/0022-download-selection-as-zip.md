# 0022 — Download is a selection written as a ZIP of originals

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** project owner
- **Relates to:** ADR 0020 (what egress forbids), AGENTS.md §1.7 (other people's
  data), §7 (performance), §17 (one archive at a time), M27

> Numbering: the milestone brief said "ADR 0021", but 0021 is
> `provenance-from-path`. This decision is 0022; nothing was renumbered.

## Context

The gallery had no way to take a file out of the browser. Everything the person
imported was readable in the tab and nowhere else. ADR 0020 already decided that
a local write is not network egress, and named batch ZIP export as legal by
construction; it did not decide what the ZIP contains, what it is named, or what
happens to an archive path that is not safe as a filename.

Three measured facts shaped the decision:

- the media in the export is already compressed (JPEG, WebP, HEIC, MP4);
- there is exactly one resolution — the export contains no higher-quality source,
  so "HD" would be a promise the data cannot keep;
- a media path is archive-relative and unique (the profile photo is referenced
  twice, by `personal_information` and `profile_photos`, but both references name
  the same path).

## Decision

**A download is the user's selection, written as a ZIP of the original blobs, at
their archive paths, built entirely in the tab.**

- **Originals only.** The tile shows a thumbnail; the download is the original
  blob. The UI says "original quality" and never "HD" or "HQ": the export has one
  resolution and this is it (D3).
- **One file is a file, not a ZIP.** A selection of exactly one, or the detail
  view's Download, saves the original blob under the archive path's last segment —
  `photo.webp` stays `photo.webp`, `clip.mp4` stays `clip.mp4`. Two or more open the
  pre-flight and the ZIP. The same path rule applies, and an unsafe path is refused
  with a reason rather than renamed.
- **Archive paths are preserved** (`posts/202402/x.webp`,
  `stories/202103/y.mp4`). The ZIP therefore unpacks into the archive's own tree,
  a file that appears in two categories is one entry, and collisions are
  impossible by construction (D2).
- **Path sanitisation is unconditional, and unsafe entries are refused, not
  rewritten.** An entry whose path is absolute (POSIX or a Windows drive), has a
  `..` segment, contains a backslash or a control character is left out, counted
  in `skipped` with reason `unsafe-path`, and named in the pre-flight. Rewriting
  would silently invent a filename; writing it would be a zip-slip in whatever
  extracts the archive. Both are worse than an honest omission.
- **A selected item with no stored blob is skipped with reason `no-blob`**, counted
  and shown before the build, never silently dropped. The count in the bar is
  therefore not always the file count in the ZIP, and the panel says so.
- **Duplicates by path are written once and counted.** This is the profile photo.
- **STORE, not DEFLATE.** The media is already compressed; deflating 133 MB costs
  seconds and saves nothing. `fflate`'s streaming `Zip` + `ZipPassThrough` feed one
  entry at a time, and the builder yields to the event loop when a frame's worth of
  time has passed so the progress bar paints. `zipSync` is never used.
- **The object URL is revoked immediately after the click.** A literal
  `URL.createObjectURL(blob)` → `<a download>` → click → revoke, with the anchor
  removed in the same `finally`. A URL that outlives its download is the leak the
  media cache already fixed.
- **Success clears the selection and leaves selection mode; failure keeps it.** A
  failure shows the reason (including the path that vanished mid-build) and the
  selection is still there to retry. Never a silent no-op.
- **Two limits are stated before the download, not discovered after it.** Above
  300 MB the panel says the ZIP is built in memory and may fail on a
  memory-constrained device; on iOS the panel says Safari may not save a large
  blob through a download link. Neither blocks the download.
- **No network.** The ZIP is assembled in memory and handed to the browser as a
  local file. Nothing is uploaded and nothing is fetched (ADR 0020).

## Privacy note (AGENTS.md §1.7)

The selected media can include message attachments — photos and videos other
people sent, and, for the CSV path already shipped, their words. This feature
surfaces them only after the person has already revealed the category, selected
the items themselves and pressed Download. The output is a file on their own
device, carrying the archive's paths so the provenance is not lost. The app does
not upload it, does not name a destination and cannot observe where it goes. The
same reasoning as ADR 0020 applies: the destination is the user's own disk and the
action is theirs.

## Options considered

1. **Deflate every entry (`zipSync`).** Rejected: seconds of CPU on already
   compressed media, for a saving near zero, and `zipSync` needs the whole tree in
   memory as a second copy.
2. **Rewrite an unsafe path into a safe one.** Rejected: it invents a filename the
   archive did not have and hides the fact that the input was hostile. Refusing and
   reporting is visible.
3. **Drop unsafe or blob-less entries silently.** Rejected: the downloaded file
   would contain fewer items than the count said, with no explanation.
4. **Persist the selection across navigation or reload.** Rejected (D1): a
   selection is a mode, not a setting. It clears on route change and is never
   stored; `localStorage` remains UI settings only.
5. **Download the thumbnail for grid convenience.** Rejected: the person asked for
   their photo, not a 512 px derivative, and the export has only one original.
6. **Per-file download buttons on every tile.** Rejected: a grid of 400 tiles with
   400 download controls is noise, and a one-entry ZIP for a single photo is a
   container the reader has to unpack to use. The detail view carries the single
   file; the grid carries selection.

## Consequences

- The plan is a pure core function (`buildZipPlan`), so every rule above is tested
  in Node with no DOM: entries, skips with reasons, duplicates, total bytes, and
  each unsafe path shape.
- The ZIP builder is a web module with an injected blob getter and progress
  callback; the tests read the produced blob back with fflate's `Unzip` and assert
  entry count, paths and bytes, and prove the entries are stored, not deflated.
- A future "save all media" is the same plan with every item selected. The
  single-file path reuses the same path rule (`isSafeArchivePath`) and the same
  save-and-revoke; it is not a second implementation of either.
- A path that is legitimately unsafe in a future export is reported, not fixed
  here. The probe that measures it belongs in `docs/archive-manifest.md` §11 when
  one appears.
