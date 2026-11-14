# 0020 — What "no network egress" actually forbids

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** project owner
- **Relates to:** AGENTS.md §1.1, §17; ADR 0001 (browser-only v1),
  `docs/T4-DESIGN.md` §4

## Context

AGENTS §1.1 said "no network egress", full stop. That wording conflated three
different things:

1. **The app contacting a third party on its own initiative.** A font CDN, a
   tracking pixel, a remote avatar, an analytics call — the app decides to talk to
   someone the user did not choose, and the request may reveal what the user is
   looking at.
2. **The app writing a file to the user's own disk.** A download is a local write.
   `<a download>` and `URL.createObjectURL` do not open a connection at all.
3. **The app syncing to storage the user chose.** The destination is the user's,
   but the request still leaves the process and needs an explicit rule about who
   can read it.

The product needs (2) and will eventually need (3). A rule that forbids them
outright is either ignored or blocks the feature; neither is acceptable.

The measured reason for drawing one hard line is in `docs/T4-DESIGN.md` §4: the
profile image URLs in `archive-2/` are signed Facebook CDN links that expired on
1–2 November 2026. Even if fetching them were permitted, they could not be
repaired locally — and the request itself would tell the CDN which profile the
user is viewing. Avatar fetching is therefore not a temporary exception; it is
permanently excluded.

## Decision

**Egress to the user's own storage, on the user's explicit action, is allowed.
Egress to a third party that learns what the user viewed is never allowed.**

The test is not "does this touch the network". The test is: **does this request
tell someone else what this person looked at?**

Consequences:

- **`<a download>` and `URL.createObjectURL` are not egress at all.** They need no
  exception, no allow-list entry and no ADR of their own. A blob URL handed to the
  browser for a local file never leaves the process.
- **Batch ZIP export is legal by construction.** `fflate` is already a dependency;
  building a ZIP in the tab and handing it to `<a download>` is local work and a
  local write.
- **Same-origin static assets remain allowed.** They are the app itself, not a
  third party, and they carry no archive data.
- **A future sync must be E2EE, or to the user's own drive, and needs its own ADR
  before any code.** The rule permits the destination; it does not decide the
  encryption, the account model, key management or conflict handling. Those are a
  later decision, not this one.
- **Avatar fetching is permanently excluded.** The signed FB CDN links expired
  1–2 Nov 2026 and cannot be repaired; the request would also reveal the viewed
  profile. The person card keeps initials, not a picture (ADR 0019).
- **The build-time privacy grep still runs.** No remote font, image, analytics or
  telemetry URL may enter the bundle. The rule is broader than the grep; the grep
  is one mechanical check, not the definition.
- **The one-sentence test is unchanged in spirit.** A stranger imports a ZIP, sees
  their archive rendered, and DevTools Network shows nothing about them leaving
  the device. A file they explicitly download is not a request about them.

## Options considered

1. **Keep "no egress" literally and forbid download/sync.** Rejected: it conflates
   a local write with a third-party request and blocks a feature the product needs.
2. **Allow any network request the user initiates.** Rejected: "the user clicked"
   is not informed consent to a CDN learning which profile they opened. The test
   is what the request reveals, not who clicked.
3. **Allow sync with no encryption requirement.** Rejected: messages are other
   people's words. A plaintext sync would move the exposure from the device to a
   server without the third parties' consent. E2EE is a condition, not a later
   hardening step.
4. **The destination test (own storage) plus the disclosure test (who learns what
   was viewed).** Chosen.

## Consequences

- AGENTS §1.1 is rewritten to the two-part rule; §17 records download and sync as
  deferred features with a decided rule, not open questions.
- A future download or ZIP feature may be implemented without reopening the
  network invariant. A future sync still needs an ADR of its own and E2EE.
- A request to a third party remains a violation even when the UI says "the user
  clicked". The reason is now written down where the next feature will read it.
- The person card's no-avatar rule and the expired-signed-URL measurement are
  linked from the same ADR, so a future contributor cannot "fix" the missing
  avatars by adding a fetch.
