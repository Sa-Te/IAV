import { findCategory } from "../registry/categories.js";

/**
 * The reveal gate's decisions, without React.
 *
 * Two independent reasons to ask "show me" before rendering (ADR 0014):
 *
 * - **tier 5** — the category is third-party authored text by definition
 *   (messages, AI replies, payment records). ADR 0009's amendment introduced this.
 * - **`gated`** — the category is the reader's own content but contains words
 *   other people wrote to them: comments. Comments are T3 ("your content") because
 *   that is where the person looks for them, and they gate because a shared screen
 *   should not open into someone else's words.
 *
 * Rendering is allowed on-device either way. The wording lives here, next to the
 * registry it describes, so it can be tested without a DOM and cannot drift away
 * from the tier data.
 */

export interface RevealCopy {
  readonly title: string;
  readonly body: string;
}

/**
 * Reads the registry rather than a hardcoded id list: the two axes are the data.
 *
 * A row that is both T5 and gated gates **once** — this is one boolean, not two,
 * and the caller mounts one gate. No row is both today; the invariant is tested
 * so a future row cannot produce a nested double gate.
 */
export function isGated(categoryId: string): boolean {
  const category = findCategory(categoryId);
  if (category === undefined) return false;
  return category.privacyTier === 5 || category.gated === true;
}

/**
 * What is actually in the category, in the reader's terms. Only categories whose
 * content has been read get a specific sentence; anything else gets the honest
 * generic one, because inventing a description of someone's data is worse than
 * admitting we have none.
 */
const COPY: Readonly<Record<string, RevealCopy>> = {
  messages_inbox: {
    title: "Your inbox conversations",
    body: "This category holds conversations other people had with you: their words, and any photos, videos or voice notes they sent. It is stored on this device exactly as the export provided it.",
  },
  messages_requests: {
    title: "Message requests",
    body: "This category holds conversations other people started with you before you accepted them: their words, and any media they sent. It is stored on this device exactly as the export provided it.",
  },
  ai_conversations: {
    title: "AI assistant conversations",
    body: "This category holds conversations you had with an AI assistant: your prompts and its replies, as Instagram recorded them.",
  },
  checkout_payment_information: {
    title: "Checkout and payment details",
    body: "This category holds payment and address records that Instagram kept for checkout: names, addresses and payment details.",
  },
  post_comments: {
    title: "Comments other people wrote on your posts",
    body: "This category holds words other people wrote to you: the comments on your posts, the account that wrote each one, and when. It is stored on this device exactly as the export provided it.",
  },
  reels_comments: {
    title: "Comments other people wrote on your reels",
    body: "This category holds words other people wrote to you: the comments on your reels, the account that wrote each one, and when. It is stored on this device exactly as the export provided it.",
  },
  liked_comments: {
    title: "Comments other people wrote that you liked",
    body: "This category holds words other people wrote to you: comments you liked, the account that wrote each one, a link to it, and when you liked it. It is stored on this device exactly as the export provided it.",
  },
  synced_contacts: {
    title: "Names and contact details from your address book",
    body: "This category holds names and contact details copied from your address book: phone numbers and email addresses belonging to people who have not necessarily used Instagram. It is stored on this device exactly as the export provided it.",
  },
};

const FALLBACK: RevealCopy = {
  title: "Third-party authored text",
  body: "This category holds text written by someone else. It is stored on this device exactly as the export provided it, and none of it has been interpreted.",
};

export function revealCopy(categoryId: string): RevealCopy {
  return COPY[categoryId] ?? FALLBACK;
}
