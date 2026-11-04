import { createContext, useContext, useMemo, type JSX, type ReactNode } from "react";

import { createListCache, type ListCache } from "./listCache.js";

/** Null outside a provider; the hook then keeps a cache for its own lifetime. */
export const ListCacheContext = createContext<ListCache | null>(null);

export function ListCacheProvider({ children }: { children: ReactNode }): JSX.Element {
  const cache = useMemo(() => createListCache(), []);
  return <ListCacheContext.Provider value={cache}>{children}</ListCacheContext.Provider>;
}

export function useListCache(): ListCache | null {
  return useContext(ListCacheContext);
}
