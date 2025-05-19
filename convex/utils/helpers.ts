import { PersistentTextStreaming } from "@convex-dev/persistent-text-streaming";
import { components } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import {
  type QueryCtx,
  type MutationCtx,
  type ActionCtx,
} from "convex/_generated/server.js";
import { ConvexError } from "convex/values";

export async function requireAuth(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const user = await ctx.auth.getUserIdentity();
  if (!user) {
    throw new ConvexError("Unauthorized");
  }
  const userId = user.subject.split("|")[0] as Id<"users">;
  return { user, userId };
}

export const persistentTextStreaming = new PersistentTextStreaming(
  components.persistentTextStreaming,
);
