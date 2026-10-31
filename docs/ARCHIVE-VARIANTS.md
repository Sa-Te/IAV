# Archive variants — risk matrix

What can differ between two Instagram exports, and which tier of the resolver
(ADR 0002) handles it. Written after the M2 inventory of one real export; every
"what we observe" below is either measured in that export (**FACT**) or reported
by other tools and unverified here (**INFERENCE**) — each row says which.

| # | Dimension | What we observe | Handled by | If it goes wrong, the user sees |
| --- | --- | --- | --- | --- |
| 1 | **Folder prefix** — `your_instagram_activity/` present, absent, or a `content/` wrapper | FACT: present in our sample, 3 levels deep under `your_instagram_activity/<area>/` | Tier 1 (basename, path-independent) + tier 2 | A whole area of the app reads "not in this export" even though the data is there. Partial data with no error. |
| 2 | **Numeric suffix style** — `_1`, `_2`, `(1)`, none, multiple parts | FACT: `posts_1.json`, `followers_1.json`, `post_comments_1.json`; all others have no suffix | Tier 1 (suffix optional in the rule) | Duplicate or missing records: a `posts_2.json` that is not matched silently loses half the posts. |
| 3 | **Filename case** | FACT: all lowercase in our sample | Tier 1 (case-insensitive match) | Linux and macOS disagree about case; a mismatch is invisible on one platform and fatal on the other. Covered by the case-insensitive rule. |
| 4 | **JSON vs HTML export variant** | FACT: our sample is JSON. The Instagram export dialog offers both. **INFERENCE:** choosing HTML produces `.html` twins of some files | **Decided (M1):** detect `.html` files with no JSON siblings and refuse with an actionable message — the export is not parsed as HTML | A clear screen stating the export is the HTML variant and telling the user to re-request it as JSON. It must never fall back to "not in this export" for all 74 categories. |
| 5 | **Category entirely absent** | FACT: 5 categories the old CLAUDE.md assumed are absent here (recently deleted, guide posts, autofill, shopping, ads clicked) | Tier 3 semantics: absence is a normal state | Nothing, if the absence is modelled as "not in this export". It is a bug if a view renders an empty container or an error. |
| 6 | **Category present but new to us** | FACT: none unrecognised in our sample | Tier 3 — unrecognised bucket | An "unrecognised data" section listing the raw structure. The data is kept; nothing is dropped. |
| 7 | **New field inside a known category** | FACT: `media_variants` exists on some stories only; `share` has 5 optional keys; `is_unsent` appears once in 28,498 messages | Schema (optional / passthrough) + `raw` | Nothing, if the schema allows unknown keys. It is a bug if the schema is strict and the parse fails on a new key. |
| 8 | **Renamed field inside a known category** | **INFERENCE:** Instagram has changed key names across export generations (e.g. `photo_metadata` vs `video_metadata` for the same slot) | Tier 2 (structural signature), then the unrecognised bucket | The category is recognised but its fields read as empty. Worst case: a gallery of blank tiles. |
| 9 | **Media path root-relative vs thread-relative** | FACT: both occur in our sample — `media/posts/<YYYYMM>/<file>` vs `photos/<file>` next to the thread's own JSON | Resolver tries the JSON's own directory, then the archive root | Blank tiles that look like the original "endless skeleton" bug. This is the highest-consequence variant in the table. |
| 10 | **Message thread folder depth and naming** | FACT: `messages/inbox/<thread>/message_1.json` and `messages/message_requests/<thread>/message_1.json`, 254 threads, identical basenames | Tier 1 on the nearest ancestor named `inbox`/`message_requests`; tier 2 on `is_pending`/`joinable_mode` | Message threads merged into one, or every thread treated as the same conversation. Identity is the relative path, not the basename, so this is contained. |
| 11 | **Encoding / mojibake** | FACT: 326/326 files pure ASCII; 66,987 mojibake strings across 18 categories; 100% round-trip | `fixMojibake` on every string (ADR 0003) | Unreadable captions and messages ("Ã°Å¸Ëœâ€š" instead of an emoji). Cosmetic but immediately visible, and it affects 18 categories. |
| 12 | **Apostrophes in filenames** | FACT: 2 files (`follow_requests_you've_received.json`, `posts_you're_not_interested_in.json`) | Tier 1, written against the raw basename | The rule never matches; two categories go missing with no error. |
| 13 | **Near-identical filenames** | FACT: `your_activity_off_meta_technologies.json` vs `…_settings.json`; `recent_follow_requests` / `pending_follow_requests` / `follow_requests_you've_received`; `profile_searches` vs `word_or_phrase_searches` | Tier 1 must anchor the pattern (full-name match, not substring) | A settings file is parsed as an activity log, or vice versa. Data appears in the wrong view. |
| 14 | **Two rules matching one file** | FACT: not observed | Hard error (ADR 0002) | A named, visible failure instead of a coin flip. This is the intended outcome. |
| 15 | **Duplicate media referenced twice** | FACT: the profile photo is referenced by both `personal_information` and `profile_photos` | `MediaFile` identity is `uri` | One file stored twice, or a missing image in one of the two views. |
| 16 | **Files with no extension** | FACT: 4 message photos are JPEGs with no extension | Magic-byte sniffing, not extension guessing | They render as broken images or are skipped as "not media". |

## What we cannot survive yet

Honest list of gaps, ordered by how likely they are to hurt.

1. **HTML export variant (row 4).** Decided in M1: v1 detects `.html` twins
   with no JSON siblings and refuses with a message telling the user to
   re-request the export as JSON. It does not parse HTML. The detection is not
   built yet (it lands with the archive loader), so today the behaviour is
   still undefined.
2. **Renamed categories (row 8).** Tier 2 can only identify a file by the
   key-set of its top-level elements. Several categories share a shape
   (`posts` vs `archived_posts`; `followers` vs `following`), so a rename that
   keeps the shape will produce an ambiguous match — which by ADR 0002 is a hard
   error. That is safe, but it means a rename causes a visible failure rather
   than a graceful recovery. We have no sample of a renamed category to test
   against.
3. **Multi-file categories (row 2).** Our sample has exactly one file per
   category except messages. `posts_2.json` has never been seen here, so the
   merge path is unverified.
4. **Compressed and split exports.** Instagram splits large exports into
   `part_1.zip`, `part_2.zip`. Nothing in the design handles multiple ZIPs yet.
   Not addressed by any ADR; deliberately out of scope for M2.5.
5. **Non-JSON media manifests.** If a variant ships a `.txt` or `.csv` index
   instead of JSON, tier 2 has nothing to read. Untested, unhandled.
6. **Locale-dependent `string_map_data` keys.** The keys are display strings
   (`"Saved on"`, `"IP Address"`). An export generated under a different account
   language would change every key name, breaking tier 2 as well. **INFERENCE:**
   unverified whether these keys are localised. This is the single most
   dangerous unknown in the table.
7. **No format version anywhere.** M2 found no version marker in the export, so
   nothing can be gated on "this schema targets version N" as AGENTS.md §6
   requires. Every variant is currently detected, not declared.
