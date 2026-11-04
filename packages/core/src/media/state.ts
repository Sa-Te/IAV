/**
 * One media state union for the whole app.
 *
 * It lives in core so the cache and the React hook cannot drift into two
 * different three-state machines. There is no fourth state and no boolean: a
 * request is pending, ready, or failed with a reason (AGENTS.md §3).
 */

/** The part of `Blob` the cache needs, so core never names a DOM type. */
export interface MediaBytes {
  readonly type: string;
  readonly size: number;
}

/** The part of `ImageBitmap` this app needs, so core stays DOM-free. */
export interface DecodedBitmap {
  readonly width: number;
  readonly height: number;
  close(): void;
}

export type MediaState =
  | { readonly status: "pending" }
  | {
      readonly status: "ready";
      readonly url: string;
      readonly mime: string;
      /** Decoded pixels when a bitmap was requested; null for video and audio. */
      readonly bitmap: DecodedBitmap | null;
    }
  | { readonly status: "failed"; readonly reason: "missing" | "decode" | "timeout" };

/** What a runtime must provide to decode a blob into pixels, or explain why not. */
export type DecodedMedia =
  | { readonly ok: true; readonly bitmap: DecodedBitmap | null }
  | { readonly ok: false; readonly reason: "decode" };
