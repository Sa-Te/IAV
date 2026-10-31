import { findCategory } from "../registry/categories.js";

/**
 * The T5 reveal gate's decisions, without React.
 *
 * T5 means "text written by someone else" (docs/DATA-MAP.md). Rendering it is
 * allowed on-device (ADR 0009), but only after the person holding the device has
 * said "show me" — a shared screen should not open straight into a conversation
 * someone else wrote. The wording lives here, next to the registry it describes,
 * so it can be tested without a DOM and cannot drift away from the tier data.
 */

export interface RevealCopy {
  readonly title: string;
  readonly body: string;
}

/** Reads the registry rather than a hardcoded id list: the tier is the data. */
export function isT5(categoryId: string): boolean {
  return findCategory(categoryId)?.privacyTier === 5;
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
};

const FALLBACK: RevealCopy = {
  title: "Third-party authored text",
  body: "This category holds text written by someone else. It is stored on this device exactly as the export provided it, and none of it has been interpreted.",
};

export function revealCopy(categoryId: string): RevealCopy {
  return COPY[categoryId] ?? FALLBACK;
}
