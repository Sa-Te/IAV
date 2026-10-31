# 0005 — Format fingerprint instead of a format version

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** project owner
- **Amends:** the version rule in AGENTS.md §6
- **Relates to:** ADR 0002, ADR 0003, `docs/archive-manifest.md` §9

## Context

AGENTS.md §6 required every schema to declare "the export format version it
targets". M2 measured the opposite: the export contains **no version marker
anywhere** — no manifest, no version file, no top-level metadata JSON. There is
nothing to declare, so the rule as written cannot be satisfied by anyone.

At the same time the need behind the rule is real: when Instagram changes the
shape of the data, a parser written against the old shape should notice, and the
user should be told, without losing what still works.

## Options considered

1. **Drop the requirement.** Simple, and honest about the export. Rejected: we
   lose the only mechanism for noticing that an export is unlike the one the
   parsers were built against.
2. **Infer a version number** (e.g. "v2") from folder layout or a date in a
   filename. Rejected: it invents a fact. Two exports with the same layout may
   differ, and two with different layouts may be identical in substance.
3. **Declare "unknown" on every schema.** Honest but inert: it detects nothing.
4. **Fingerprint the observed shape.** Chosen.

## Decision

At parse time, compute a deterministic signature from:

1. the sorted set of **resolved category ids** present in the archive, and
2. the sorted **top-level key-set of each category's first entry**.

Hash it to a short stable id (`fmt-a3f9c1` style). Store it with the archive.

If a later parse produces a different fingerprint from the one this build was
recorded against, surface a **non-blocking warning**:

> This export's shape differs from the one this version was built against — some
> data may not display.

Never fail on a mismatch. A fingerprint mismatch is information for the user and
a signal for us; it is not an error condition, and it must never stop the archive
from opening.

## Consequences

- **AGENTS.md §6 now says "fingerprint", not "version".** The rule reads: "Every
  schema records the archive's shape fingerprint (ADR 0005). There is no format
  version in the export to read."
- **A schema change that alters a fingerprint is an ADR.** The fingerprint is a
  contract with every archive a user has already imported.
- **Absence is part of the signal.** The fingerprint covers which categories are
  present, so a second export missing a category changes the fingerprint — which
  is correct, because from the schema's point of view the shape really is
  different.
- **The warning is per archive, not per category.** The user gets one line, not
  74.
- **Deterministic and cheap.** Sorting keys and hashing a string is O(keys) per
  category, trivial next to the 28.7 MB JSON corpus.
