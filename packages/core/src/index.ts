export { CATEGORIES, UNRECOGNISED, findCategory } from "./registry/categories.js";
export { resolveCategory } from "./registry/resolve.js";
export type { ResolveInput, ResolveResult } from "./registry/resolve.js";
export { computeFingerprint } from "./registry/fingerprint.js";
export type { ResolvedCategory } from "./registry/fingerprint.js";
export { parseArchivedPosts } from "./parsers/archivedPosts.js";
export type { ArchivedPostEntry } from "./parsers/archivedPosts.js";
export { parseStories } from "./parsers/stories.js";
export type { StoryEntry } from "./parsers/stories.js";
export { parsePosts } from "./parsers/posts.js";
export { toMediaItems } from "./domain/media.js";
export type { MediaItemView } from "./domain/media.js";
export { toPostEntries } from "./domain/posts.js";
export { entryCountForView } from "./categories/entryCount.js";
export type { PostEntry } from "./domain/posts.js";
export {
  createMediaCache,
  MAX_CONCURRENT_LOADS,
  MEDIA_CACHE_CAP,
  MEDIA_REQUEST_DEADLINE_MS,
  MediaTimeoutError,
} from "./media/cache.js";
export type { MediaCache, MediaCacheRuntime, PathTimeline } from "./media/cache.js";
export type { DecodedBitmap, DecodedMedia, MediaBytes, MediaState } from "./media/state.js";
export {
  makeThumbnail,
  thumbnailDimensions,
  THUMBNAIL_MAX_EDGE,
  THUMBNAIL_QUALITY,
} from "./media/thumbnail.js";
export type { Dimensions, ThumbnailEncoder } from "./media/thumbnail.js";
export {
  locateThread,
  sortThreads,
  threadMessages,
  toThreadSummaries,
  toThreadSummary,
} from "./messages/threads.js";
export type {
  ThreadAttachment,
  ThreadFolder,
  ThreadMessage,
  ThreadSummary,
} from "./messages/threads.js";
export {
  BASE_RADIUS,
  camera,
  CAMERA_DISTANCE,
  CARD_SIZE_SHARE,
  focusedIndex,
  FOV_Y,
  GOLDEN_ANGLE,
  RIBBON_DEPTH,
  RIBBON_SPREAD_SHARE,
  ribbonSpread,
  totalHeightOf,
  vortexLayout,
  RADIUS_BREATH,
  VERTICAL_SPACING,
} from "./cyclone/layout.js";
export type { CardTransform } from "./cyclone/layout.js";
export { projectCards } from "./cyclone/projection.js";
export type { Camera, ScreenCard } from "./cyclone/projection.js";
export { pickNearest } from "./cyclone/picking.js";
export { DEFAULT_WINDOW_SIZE, residentWindow } from "./cyclone/window.js";
export {
  advance,
  easeTilt,
  IDLE_VELOCITY,
  MAX_SPIN,
  NO_TILT,
  PHASE_PER_PIXEL,
  reducePhase,
  stillPhase,
  TILT_LIMIT,
  tiltTarget,
} from "./cyclone/motion.js";
export type { PhaseEvent, PhaseState, Tilt } from "./cyclone/motion.js";
export { isGated, revealCopy } from "./categories/privacy.js";
export type { RevealCopy } from "./categories/privacy.js";
export { PAGE_SIZE, toTableView } from "./categories/toTableView.js";
export type { CategoryViewData, Cell, TableView, TreeView } from "./categories/toTableView.js";
export { toSettingsView } from "./categories/settingsView.js";
export type {
  SettingEntry,
  SettingField,
  SettingsView,
  SettingValue,
} from "./categories/settingsView.js";
export {
  groupByMonthAndYear,
  shortcodeOf,
  toEventListView,
  YEAR_LEVEL_MIN_MONTHS,
} from "./categories/eventListView.js";
export type {
  EventDay,
  EventEntry,
  EventGrouping,
  EventListView,
  EventMonth,
  EventYear,
} from "./categories/eventListView.js";
export type { EventPreview, PollOption } from "./categories/eventPreview.js";
export { toSavedCollectionsView, toSavedPostsByFolder } from "./categories/savedByFolder.js";
export type { SavedByFolderView, SavedFolder, SavedItem } from "./categories/savedByFolder.js";
export { toNameListView } from "./categories/nameListView.js";
export type { NameListView, NameListSection } from "./categories/nameListView.js";
export { toAvatarItemsView } from "./categories/avatarItemsView.js";
export type { AvatarItem, AvatarItemsView } from "./categories/avatarItemsView.js";
export { toDeviceEffectsView } from "./categories/deviceEffectsView.js";
export type {
  DeviceEffectsView,
  DeviceProfile,
  DeviceRecord,
} from "./categories/deviceEffectsView.js";
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
