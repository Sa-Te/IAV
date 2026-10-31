export { CATEGORIES, UNRECOGNISED, findCategory } from "./registry/categories.js";
export { resolveCategory } from "./registry/resolve.js";
export type { ResolveInput, ResolveResult } from "./registry/resolve.js";
export { computeFingerprint } from "./registry/fingerprint.js";
export type { ResolvedCategory } from "./registry/fingerprint.js";
export { parseArchivedPosts } from "./parsers/archivedPosts.js";
export type { ArchivedPostEntry } from "./parsers/archivedPosts.js";
export { parseStories } from "./parsers/stories.js";
export type { StoryEntry } from "./parsers/stories.js";
export { toMediaItems } from "./domain/media.js";
export type { MediaItemView } from "./domain/media.js";
export { toPostEntries } from "./domain/posts.js";
export type { PostEntry } from "./domain/posts.js";
export { createMediaCache, MEDIA_CACHE_CAP } from "./media/cache.js";
export type { MediaCache, MediaCacheRuntime } from "./media/cache.js";
export type { DecodedBitmap, DecodedMedia, MediaBytes, MediaState } from "./media/state.js";
export {
  makeThumbnail,
  thumbnailDimensions,
  THUMBNAIL_MAX_EDGE,
  THUMBNAIL_QUALITY,
} from "./media/thumbnail.js";
export type { Dimensions, ThumbnailEncoder } from "./media/thumbnail.js";
export { isT5, revealCopy } from "./categories/privacy.js";
export type { RevealCopy } from "./categories/privacy.js";
export { PAGE_SIZE, toTableView } from "./categories/toTableView.js";
export type { CategoryViewData, Cell, TableView, TreeView } from "./categories/toTableView.js";
export { fixMojibake } from "./strings/fixMojibake.js";
export { normaliseStrings } from "./strings/normaliseStrings.js";
export {
  runIngest,
  BATCH_SIZE,
  CHUNK_BYTES,
  PROGRESS_INTERVAL_MS,
  SPACE_FACTOR,
} from "./ingest/ingest.js";
export type { RunIngestOptions } from "./ingest/ingest.js";
export {
  IDLE,
  describeFailure,
  failed,
  isRunning,
  parsing,
  ready,
  recoverPersistedJob,
} from "./ingest/job.js";
export type {
  IngestFailureReason,
  IngestJob,
  IngestPhase,
  IngestSummary,
  UnrecognisedShape,
} from "./ingest/job.js";
export type {
  ArchiveCounts,
  ArchiveRow,
  Batch,
  CategoryRecord,
  DriftReport,
  IngestSink,
  MediaRecord,
} from "./ingest/port.js";
