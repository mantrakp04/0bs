"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import SuperJSON from "superjson";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import Dexie, { type Table } from "dexie";
import {
  type PersistedClient,
  type Persister,
} from "@tanstack/react-query-persist-client";

import { type AppRouter } from "@/server/api/root";
import { createQueryClient } from "./query-client";

// Define Dexie DB structure
interface PersistedCacheEntry {
  id: string;
  client: PersistedClient;
}

class CacheDB extends Dexie {
  cache!: Table<PersistedCacheEntry, string>; // string is the type of the primary key 'id'

  constructor() {
    super("trpcQueryCacheDB"); // Database name
    this.version(1).stores({
      cache: '++id', // Primary key 'id', auto-incremented (using ++ prefix is common but we'll use a fixed key)
                     // A simpler definition with a fixed key: 'id'
    });
    // Re-define with a fixed key as we only store one entry
    this.version(2).stores({
       cache: '&id', // Primary key 'id', enforce uniqueness (&)
    });
  }
}

const db = new CacheDB();

/**
 * Creates a Dexie-based persister for TanStack Query
 */
export function createDexiePersister(dbKey: string = 'trpcQuery'): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await db.cache.put({ id: dbKey, client });
    },
    restoreClient: async () => {
      const entry = await db.cache.get(dbKey);
      return entry?.client;
    },
    removeClient: async () => {
      await db.cache.delete(dbKey);
    },
  };
}

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  clientQueryClientSingleton ??= createQueryClient();

  return clientQueryClientSingleton;
};

export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// Create persister for client-side only
const createPersister = () => {
  if (typeof window === "undefined") return undefined;

  // Use Dexie persister instead of localStorage
  return createDexiePersister('trpc-query-cache');

  /* Previous implementation using localStorage:
  return createSyncStoragePersister({
    storage: window.localStorage,
    key: 'trpc-query-cache',
    serialize: SuperJSON.stringify,
    deserialize: SuperJSON.parse,
  });
  */
};

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const persister = createPersister();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
        }),
      ],
    }),
  );

  if (!persister) {
    // Server-side rendering - use regular QueryClientProvider
    return (
      <QueryClientProvider client={queryClient}>
        <api.Provider client={trpcClient} queryClient={queryClient}>
          {props.children}
        </api.Provider>
      </QueryClientProvider>
    );
  }

  // Client-side rendering - use PersistQueryClientProvider
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </PersistQueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
