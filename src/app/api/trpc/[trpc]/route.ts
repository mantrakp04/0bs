import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "@/env";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
    responseMeta(opts) {
      const { type, errors } = opts;
      
      // Check if it's a successful query request
      const allOk = errors.length === 0;
      const isQuery = type === 'query';
      
      if (allOk && isQuery) {
        // Cache successful queries for 1 minute and allow stale responses for up to 1 day
        const ONE_MINUTE = 60;
        const ONE_DAY = 60 * 60 * 24;
        
        return {
          headers: new Headers([
            ['Cache-Control', `s-maxage=${ONE_MINUTE}, stale-while-revalidate=${ONE_DAY}`],
          ]),
        };
      }
      
      return {};
    },
  });

export { handler as GET, handler as POST };
