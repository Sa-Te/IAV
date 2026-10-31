/**
 * The one seam every data access goes through (AGENTS.md §2).
 *
 * M1 stub: the interface and its types only. `LocalArchiveRepository` over
 * IndexedDB lands in M3, and it is the only module in the repo allowed to touch
 * `indexedDB`.
 */

export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

export interface MediaItem {
  readonly id: string;
  readonly uri: string;
  readonly takenAt: string;
}

export interface MediaFilter {
  readonly kind?: "image" | "video";
  readonly cursor?: string | null;
}

export interface ArchiveSummary {
  readonly fingerprint: string;
  readonly categoryCount: number;
  readonly mediaCount: number;
}

/** Category ids come from the resolver registry (ADR 0002), e.g. "posts". */
export type CategoryKey = string;

/** One entry per category, validated into the domain model by `packages/core`. */
export type CategoryData = Readonly<Record<CategoryKey, unknown>>;

export interface ArchiveRepository {
  listMedia(filter: MediaFilter): Promise<Page<MediaItem>>;
  getMediaBlob(id: string): Promise<Blob | null>;
  getCategory<K extends CategoryKey>(key: K): Promise<CategoryData[K]>;
  summary(): Promise<ArchiveSummary>;
}
