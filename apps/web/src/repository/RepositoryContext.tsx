import { createLocalArchiveRepository, type ArchiveRepository } from "@instavault/storage";
import { createContext, useContext, useEffect, useState, type JSX, type ReactNode } from "react";

/**
 * The only way a component reaches data. Views never touch IndexedDB or the
 * network directly (AGENTS.md §2); they read through this repository.
 */
const RepositoryContext = createContext<ArchiveRepository | null>(null);

export function RepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode;
  /** Injected by tests; in the app it is opened once from IndexedDB. */
  repository?: ArchiveRepository;
}): JSX.Element {
  const [ready, setReady] = useState<ArchiveRepository | null>(repository ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (repository !== undefined) return;
    let cancelled = false;
    createLocalArchiveRepository()
      .then((opened) => {
        if (!cancelled) setReady(opened);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  if (failed) {
    return (
      <p role="alert">
        Could not open the local archive store. Reload the page; if it persists, your browser may be
        blocking storage for this site.
      </p>
    );
  }

  if (ready === null) {
    return <p role="status">Opening the local archive…</p>;
  }

  return <RepositoryContext.Provider value={ready}>{children}</RepositoryContext.Provider>;
}

export function useArchiveRepository(): ArchiveRepository {
  const repository = useContext(RepositoryContext);
  if (repository === null) {
    throw new Error("useArchiveRepository must be used inside <RepositoryProvider>");
  }
  return repository;
}
