/**
 * Ambient declaration for the WHATWG `TextDecoder`, present in Node >= 11 and in
 * every browser. Declared here instead of pulling in `lib.dom`, so that
 * `packages/core` keeps a DOM-free type environment (AGENTS.md §2).
 */
declare class TextDecoder {
  constructor(label?: string, options?: { fatal?: boolean });
  decode(input?: Uint8Array): string;
}

/**
 * Timer globals, declared for the same reason as TextDecoder: the media cache
 * needs a deadline and `lib.dom` is not available here. Both exist in Node and in
 * every browser.
 */
declare function setTimeout(handler: () => void, timeout?: number): number;
declare function clearTimeout(handle: number | undefined): void;
