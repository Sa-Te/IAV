# 0003 — Mojibake, not encoding

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** project owner
- **Relates to:** M2 inventory (`docs/archive-manifest.md` §0.2), ADR 0002

## Context

The frozen Go backend (`reference-backend/`) reads every caption-bearing file
through `charmap.ISO8859_1.NewDecoder()` before JSON parsing, and
`reference-frontend/lib/fixEncoding.ts` repairs the result again on the client.
Both exist because Instagram's export mangles non-ASCII text.

M2 measured what is actually in the files:

| Measurement | Result |
| --- | --- |
| JSON files | 326 |
| Files that are pure ASCII (every byte `< 0x80`) | **326** |
| Files that are ISO-8859-1 encoded on disk | **0** |
| String values containing code points `U+0080`–`U+00FF` | **66,987** |
| Files containing at least one such string | 195 |
| Categories containing at least one such string | **18** |
| Such strings that round-trip `latin-1 encode → utf-8 decode` | **66,987 (100%)** |
| Such strings that fail that round-trip | **0** |

The corruption is therefore **not** a file encoding. Instagram wrote UTF-8
bytes as if they were Latin-1 *inside the JSON string values*, then escaped the
result as `\uXXXX`. Decoding the byte stream as Latin-1 is a no-op: it changes
nothing and protects nothing.

## Decision

1. JSON is decoded as **normal UTF-8**. No byte-level charset translation
   anywhere.
2. A **pure function** `fixMojibake(value: string): string` is applied to
   **every string in every category** after decode — not only to `posts` and
   `stories`.
3. The function is defensive by contract:
   - it attempts `latin-1 encode → utf-8 decode`;
   - if either step throws, or the input is ASCII, it returns the input
     unchanged;
   - it is a pure `string → string` function with no I/O, no React, and no
     DOM, so it lives in `packages/core` and runs under `node` in a test
     (AGENTS.md §2).

## Options considered

1. **Byte-level Latin-1 decode of the file** (what the Go backend does).
   Rejected on two counts: it is a measured no-op on these files, and it would
   *actively corrupt* any genuinely non-ASCII export — a UTF-8 export from a
   future variant would be double-mangled. It also cannot be applied per-field,
   so it would mangle non-text JSON too.
2. **Per-category repair, only where mojibake is currently observed.**
   Rejected: the set of affected categories is a property of *this* export, not
   of the format. Messages and comments are affected here; another export may
   put text somewhere new. Repairing every string is uniform and cheap.
3. **Leave the text mangled and render it as-is.** Rejected: the product is a
   memory viewer; unreadable captions defeat it.
4. **Repair every string after decode.** Chosen.

## Consequences

- **This function is test case #1.** It is pure, it is 20 lines, it has exactly
  one job, and every text-bearing category depends on it. It gets a test before
  any parser exists: ASCII passthrough, emoji, accented Latin, a mixed string,
  an already-correct non-ASCII string that must be left alone, and invalid
  input that must not throw.
- **Scope is 18 categories, not a handful.** Measured: `liked_posts` (45,026
  strings), `messages_inbox` (20,797), `post_comments` (387),
  `messages_requests` (213), `liked_comments` (177), `polls` (162),
  `advertisers_using_your_activity_or_information` (121), `profile_changes`
  (38), `stories` (23), `posts` (21), `archived_posts` (8), `synced_contacts`
  (6), `link_history` (2), `reels_comments` (2), and one each in
  `posts_you're_not_interested_in`, `your_activity_off_meta_technologies`,
  `devices`, `login_activity`.
- **False positives are inherent and accepted.** A string that genuinely
  contains `Ã©`-looking text will be "repaired" into something else. There is no
  way to distinguish the two without knowing the intended text. The cost is
  cosmetic and rare; the alternative (leaving 66,987 strings unreadable) is far
  worse.
- **Repair must be applied once, at the trust boundary.** Applying it twice to
  already-repaired text is mostly harmless (the second pass usually fails the
  utf-8 decode and returns the input), but it is not guaranteed idempotent for
  every string. Parsers apply it exactly once, when a string enters the domain
  model, never in a view.
- **The Go processor is not a specification for this.** `reference-backend/` is
  read as a specification for the *format*; on encoding it is now measurably
  wrong and must not be ported. `reference-frontend/lib/fixEncoding.ts` is the
  correct algorithm and may be ported almost verbatim.
