# 0008 — Multiple measured signatures per category

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** project owner
- **Amends:** ADR 0002 (tier 2 and its specificity tie-break)
- **Relates to:** ADR 0005, `docs/DRIFT-2026-10-31.md`

## Context

ADR 0002 gave every category exactly one structural signature, derived from one
measured export. The M7 drift measurement compared that export (`archive/`, 74
categories, fingerprint `fmt-92b725`) with a second one (`archive-2/`, 60
categories, fingerprint `fmt-e57990`) and found that **~30 categories kept their
filename and changed shape entirely**: the named wrapper
(`{"impressions_history_posts_seen": [...]}`) became the label/value envelope
(`{fbid, label_values, media, timestamp}`).

Tier 1 (basename) still resolved all of them, so no data was lost — but every one
of their `requiredKeys` signatures is now false against the new export. A single
`signature: Signature | null` field cannot describe a category that has been
measured in two shapes. The honest options were:

## Options considered

1. **`signatures: Signature[]` on the row, matching if any element matches.**
   One row per category, every shape ever measured recorded, tier 2 succeeds
   under either format.
2. **One registry row per (category, format).** Truthful, but multiplies rows by
   format: "how many categories are there" stops having an answer, DATA-MAP gains
   a dimension, and every consumer that keys by category id has to pick a row.
3. **Loosen the existing signature** (drop the wrapper key so the envelope
   passes). Rejected outright: it accepts a shape nobody measured and converts a
   visible failure into a silent one.

## Decision

Option 1. `Category.signatures` is a **readonly list**; a category with two
measured formats carries two entries, each with a comment naming the export it
was measured from.

Tier 2 is restated accordingly:

- every signature of every row is tried against the sample;
- a row fits at the specificity of its **best-fitting** signature — the matched
  one requiring the most keys;
- the candidates are the rows whose best fit is the highest specificity;
- **two different rows** tied at the top are still a hard ambiguity error. Two
  signatures of the *same* row are never ambiguous with each other.

An empty list is legal. It means "name-resolvable only": the row still resolves
at tier 1 and never contributes a tier-2 candidate. That is the type-level form
of the unrecognised bucket, whose signature is impossible by definition.

## Consequences

- Rows carry a list, so the tie-break is defined per signature, not per row. A
  row that adds a looser second signature does not drag its own specificity down.
  Covered by `registry.test.ts` ("scores a row by its best-fitting signature").
- A changed shape means **more** signatures, never a looser one. A signature is a
  measurement, and the registry is a record of measurements.
- Drift reports satisfaction **per signature**
  (`signaturesStillSatisfied: boolean[]`), so a report can say which format an
  export used, not merely "satisfied" (ADR 0005's fingerprint aggregates the same
  fact for the user-facing warning).
- The registry is now a superset of every format measured. A row whose second
  signature was never measured cannot exist, which keeps the "no guessed shape"
  rule intact.
- `resolveCategory` takes an optional registry argument so a shape model can be
  proved against invented rows; production passes nothing and uses the measured
  registry.
