import type { IngestJob } from "../../src/ingest/job.js";
import type {
  ArchiveRow,
  Batch,
  CategoryRecord,
  IngestSink,
  MediaRecord,
} from "../../src/ingest/port.js";

/**
 * In-memory implementation of the ingest sink. This is the whole point of the
 * port: the pipeline is tested without IndexedDB, and the storage adapter is
 * tested on its own.
 */
export class MemorySink implements IngestSink {
  job: IngestJob | null = null;
  archive: ArchiveRow | null = null;
  readonly categories = new Map<string, CategoryRecord>();
  readonly media = new Map<string, MediaRecord>();
  batches = 0;

  constructor(private readonly freeBytes: number | null = 2_000_000_000) {}

  async readJob(): Promise<IngestJob | null> {
    return this.job;
  }

  async writeJob(job: IngestJob): Promise<void> {
    this.job = job;
  }

  async writeBatch(batch: Batch): Promise<void> {
    this.batches += 1;
    for (const record of batch.categories ?? []) this.categories.set(record.id, record);
    for (const record of batch.media ?? []) this.media.set(record.path, record);
  }

  async commitArchive(row: ArchiveRow): Promise<void> {
    this.batches += 1;
    this.archive = row;
  }

  async clear(): Promise<void> {
    this.batches += 1;
    this.archive = null;
    this.job = null;
    this.categories.clear();
    this.media.clear();
  }

  async estimateFreeBytes(): Promise<number | null> {
    return this.freeBytes;
  }

  async storedCategoryIds(): Promise<readonly string[]> {
    return [...this.categories.keys()];
  }
}
