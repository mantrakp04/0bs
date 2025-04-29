import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import SuperJSON from "superjson";

export const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
        // Enable persistence of stale data for offline support
        gcTime: 24 * 60 * 60 * 1000, // 24 hours
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });

  return queryClient;
};

// Create persister for client-side only
export const createPersister = () => {
  if (typeof window === "undefined") return undefined;
  
  return createSyncStoragePersister({
    storage: window.localStorage,
    key: 'trpc-query-cache',
    serialize: SuperJSON.stringify,
    deserialize: SuperJSON.parse,
  });
};
