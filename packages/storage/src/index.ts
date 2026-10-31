/**
 * Public entry point for the storage package.
 *
 * Explicit exports, not `export *`: a barrel that re-exports everything hides the
 * dependency direction (AGENTS.md §5).
 */
export { DB_NAME, DB_VERSION, openDatabase, upgrade } from "./db.js";
export type { OpenedDatabase, StoreName } from "./db.js";
export {
  LocalArchiveRepository,
  createLocalArchiveRepository,
  type ArchiveRepository,
  type MediaFilter,
  type MediaRow,
  type Page,
} from "./localArchiveRepository.js";
