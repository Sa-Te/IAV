# T5 — their words: what the five categories actually contain

Measured from `archive-2/` on 2026-11-14 (M24), before the T5 screens were
finished. This document is the evidence for the attachment reader, the
conversation-count fix, search and the three last screens. It contains key names,
label strings, counts and path shapes only: no message text, no usernames, no
thread folder names, no filenames.

The probe read every `message_1.json` under
`your_instagram_activity/messages/` (263 files), the AI-conversation file and the
payment file, and every T5 category through the app's own ingest path.

## 1. The five present rows

| Category | Entries (stored) | Shape | Screen today | Screen it needs |
| --- | ---: | --- | --- | --- |
| `messages_inbox` | 252 | 122 files → 121 conversations | thread list, gated | thread list + conversation, attachments, search |
| `messages_requests` | 967 | 142 files → 142 conversations | thread list, gated | the same |
| `ai_conversations` | 2 | label/value envelope with nested turns | generic table/tree, gated | labelled record, turns collapsed |
| `checkout_payment_information` | 1 | label/value envelope, settings-shaped | generic table/tree, gated | the settings screen |
| `threads_viewed` | 246 | one-key wrapper of `string_map_data` | generic table/tree, gated | the event list, `Author` as hero |

All five are tier 5 and therefore already gate. No new gate is needed for T5.

## 2. The conversation-count defect

`entryCountOf` sums each thread object's first array child. A thread object's
first array is usually `messages`, so the stored count is a **message** count:

| Category | Stored entries | Conversations the thread list shows |
| --- | ---: | ---: |
| `messages_inbox` | 252 | 121 |
| `messages_requests` | 967 | 142 |

The sidebar printed the stored number, so it said 252 conversations where the
screen said 122. This is a counting defect, not a measurement choice.
`entryCountForView` now asks `toThreadSummaries` for the thread categories: one
conversation per folder, including a thread split across `message_1.json` and
`message_2.json`. The raw stored count stays in drift reports, which describe
files, not screens.

Across both message families the 263 files hold **33,870 messages**. (The
projection said "28k"; the measured number is higher.) `messages_inbox` has 122
files but 121 conversations: one thread is split across `message_1.json` and
`message_2.json`, and the thread reader merges it.

## 3. Attachments

### 3.1 What the export carries

Every attachment is one object with two keys, measured across all 103:

| Key | Attachments carrying it |
| --- | ---: |
| `uri` | 103 |
| `creation_timestamp` | 90 |

There is **no width, height or duration field** in the attachment object. The
conversation view reads dimensions from the decoded image and duration from the
video/audio element when the browser knows it; otherwise it shows the type label
and no invented number.

| Kind | Messages carrying it | Attachments |
| --- | ---: | ---: |
| Photos | 81 | 81 |
| Videos | 12 | 12 |
| Audio files | 6 | 6 |
| GIFs | 0 | 0 |
| **Any** | **99** | **103** |

No message carries more than one attachment type: `multiType = 0`. Four messages
carry more than one attachment of the same type (103 − 99).

### 3.2 What `content` says when media is present

Measured across all 99 messages with an attachment:

- **99 of 99 have `content: ""`.** The export does not write a placeholder beside
  media it actually included.
- 0 messages have both media and non-empty content.

So the rule "do not print a placeholder above a photo it describes" is satisfied
by the data: there is no text to suppress. The code still checks, because a future
export could write one.

### 3.3 The placeholder with no media

The export writes an attachment line and then omits the file. The exact shape is
`<sender> sent an attachment.` — for the reader's own messages the literal string
is `You sent an attachment.`, and for an unresolved account it is
`Instagram user sent an attachment.` This is a literal written by Instagram, not
our placeholder.

Measured count: **17,200 messages** say "sent an attachment." and carry no media
in this export. (52 more content lines are call events such as "Audio call ended";
they are not attachments.) These render as an explicit "attachment not included in
this export" note, not as a dead placeholder.

## 4. Provenance — every attachment is under its own thread folder

All **103 of 103** media URIs contain the thread folder that owns the message:

```
your_instagram_activity/messages/<family>/<thread>/<kind>/<filename>
```

- `family` is `inbox` or `message_requests`;
- `thread` is the folder the `message_1.json` sits in;
- `kind` is `photos`, `videos` or `audio`;
- `filename` is the last segment.

`mediaPathChecks` from the probe: `total: 103, underThread: 103, notUnderThread: 0`.
No thread's media is under another thread's folder, so D5's provenance-from-path
rule is safe.

Category media has a different, equally stable shape:

```
media/<categoryId>/<YYYYMM>/<filename>
```

Measured directory prefixes: `posts`, `stories`, `archived_posts`. A path outside
`messages/` therefore falls to the category branch with the first segment after
`media/` as its `categoryId`.

`mediaProvenance(path)` is pure core: it returns either
`{kind: "message", family, threadFolder, filename}` or
`{kind: "category", categoryId}`. It reads the path only; no stored field is
added.

## 5. AI conversations — the nesting

Two records. That is enough to measure the shape and **not enough to generalise**;
the reader falls back to the settings/table view when the turn container is absent.

Entry keys: `title`, `timestamp`, `media`, `label_values`, `fbid`. Both records
carry a non-empty `title` and a positive `timestamp`. `media` is empty in both.

`label_values` is a flat list of labels plus **three label-less containers**
(`{title, dict}`):

- flat labels, verbatim: `Unread`, `Folder`, `Pinned messages`, `Word effects`,
  `Nicknames`, `Group join options`, `Labels`, `Are you an admin?`, `Summary`,
  `Image`;
- three containers with a `title` and a `dict`; two are empty, one is the
  conversation.

The conversation container's `dict` is an ordered list of turns. Each turn is
again `{title: "", dict: [...]}`. Inside one turn:

| Inner label / container | Meaning measured |
| --- | --- |
| `Message` (label, value) | the turn's text; the second `Message` label is empty |
| `Name` (label, value) | the speaker/role string for the turn |
| `Translated message` | usually empty |
| `Replying to`, `Transcription` | often present with no value |
| label-less `{timestamp_value}` container | the turn's time |
| label-less `{title, dict}` containers | reactions/stickers and similar per-turn extras |

The reader picks the first non-empty `Message`, the `Name` as the role, the
`timestamp_value` as the turn date, and preserves the order of the outer `dict`.
The title and the entry `timestamp` are the header. It does not read the
per-turn extras beyond their presence.

## 6. Checkout and payment — settings-shaped

One entry, the same envelope keys as T1: `timestamp`, `media`, `label_values`,
`fbid`. The labels are flat except for one container:

| Flat labels, verbatim | Container labels, verbatim |
| --- | --- |
| `Region`, `Marketing offer seen time`, `Update time`, `Name`, `First name`, `Surname` | `Email address`, `Primary email address`, `Update time`, `Verification time`, `Verified` |

That is exactly the shape `toSettingsView` already reads (label/value envelopes,
`timestamp_value`, nested `dict`), so the payment screen is the T1 settings screen
behind the existing gate. No bespoke screen.

## 7. Threads viewed — the event list with another hero

246 entries under the wrapper `text_post_app_text_post_app_posts_seen`. Each
entry has `string_map_data` with three labels:

| Label | Carries |
| --- | --- |
| `Author` | `value` — the account |
| `Time` | `timestamp` — the view time |
| `URL` | `href` — the post link |

`toEventListView` already reads `string_map_data` dates (the T2/T3 path). The only
new mapping is `Author` as the hero. The screen is the existing event list behind
the tier-5 gate.

## 8. Screen assignment

| Screen | Categories | Count |
| --- | --- | ---: |
| Thread list → conversation, with attachments and search | `messages_inbox`, `messages_requests` | 2 |
| Labelled record with collapsed turns | `ai_conversations` | 1 |
| Settings screen, gated | `checkout_payment_information` | 1 |
| Event list, gated, `Author` hero | `threads_viewed` | 1 |

No T5 category is left on the generic table or tree by omission. The two message
categories already had a thread list; they gain attachments, provenance and
search. The other three are the remaining screen work.

## 9. Decisions this measurement supports

- **Search** is a pure in-memory index over 33,870 message bodies. That is a
  measurement, not an assumption; no worker and no persistence are needed unless
  the measured build/query time says otherwise (reported with the implementation).
- **Attachments** render by kind from the `uri`, with no width/height/duration
  invented. A placeholder with no media is a note, not an image slot.
- **Provenance** is path-only. The gallery can say which family and thread a tile
  came from without a new IndexedDB field (ADR 0021).
- **AI conversations** are 2 records, so the screen is a labelled record with the
  turns collapsed; a chat UI would invent a conversation model the export does
  not carry.
- **`checkout_payment_information`** is settings-shaped; no bespoke screen.
