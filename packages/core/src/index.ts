export { CATEGORIES, UNRECOGNISED, findCategory } from "./registry/categories.js";
export { resolveCategory } from "./registry/resolve.js";
export type { ResolveInput, ResolveResult } from "./registry/resolve.js";
export { computeFingerprint } from "./registry/fingerprint.js";
export type { ResolvedCategory } from "./registry/fingerprint.js";
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
