import type { Category } from "../registry/types.js";

/**
 * Where a media reference points, relative to what.
 *
 * The registry declares one base per category, but an export may use the other:
 * M5 measured message media written root-relative while the registry said
 * thread-relative. Both callers therefore try the declared base first and the
 * other second — this module is the only place that knows the rule, so ingest
 * (which needs the path) and drift (which needs to report which base won) cannot
 * disagree about it.
 */
export type MediaBase = "root-relative" | "thread-relative";

export interface MediaHit {
  readonly path: string;
  readonly base: MediaBase;
}

export function mediaCandidates(
  uri: string,
  dir: string,
  declared: MediaBase,
): readonly MediaHit[] {
  const root: MediaHit = { path: uri, base: "root-relative" };
  const thread: MediaHit = { path: `${dir}/${uri}`, base: "thread-relative" };
  return declared === "thread-relative" ? [thread, root] : [root, thread];
}

/**
 * A wrong guess is a miss, never a crash: `exists` is a plain predicate over the
 * archive's entry names, and a reference that hits neither base returns null.
 */
export function resolveReference(
  uri: string,
  dir: string,
  declared: MediaBase,
  exists: (path: string) => boolean,
): MediaHit | null {
  return mediaCandidates(uri, dir, declared).find((hit) => exists(hit.path)) ?? null;
}

/** The declared base, or null for a category that carries no media. */
export function declaredBase(category: Category | undefined): MediaBase | null {
  const mediaPath = category?.mediaPath ?? "none";
  return mediaPath === "none" ? null : mediaPath;
}
