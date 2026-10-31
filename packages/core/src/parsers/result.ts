/** AGENTS.md §6: parsers never throw on unexpected input. */
export interface Warning {
  readonly code: string;
  readonly detail: string;
}

export type ParseResult<T> =
  | { readonly ok: true; readonly data: T; readonly warnings: readonly Warning[] }
  | { readonly ok: false; readonly reason: string; readonly raw: unknown };
