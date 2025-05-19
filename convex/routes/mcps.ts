import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";
import { api } from "convex/_generated/api";
import type { Doc } from "convex/_generated/dataModel";
import { crud } from "convex-helpers/server/crud";
import schema from "../schema.js";

export const {
  create: mcpCreate,
  read: mcpRead,
  update: mcpUpdate,
  destroy: mcpDestroy,
} = crud(schema, "mcps");

export const get = query({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const mcp = await ctx.db
      .query("mcps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.mcpId))
      .first();

    if (!mcp) {
      throw new Error("MCP not found");
    }

    return mcp;
  },
});

export const getAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: v.optional(
      v.object({
        status: v.optional(
          v.union(
            v.literal("running"),
            v.literal("stopped"),
            v.literal("error"),
          ),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const mcps = await ctx.db
      .query("mcps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        args.filter?.status
          ? q.eq(q.field("status"), args.filter.status)
          : q.eq(1, 1),
      )
      .paginate(args.paginationOpts);

    return mcps;
  },
});

export const getMultiple = query({
  args: {
    mcpIds: v.array(v.id("mcps")),
  },
  handler: async (ctx, args): Promise<Doc<"mcps">[]> => {
    await requireAuth(ctx);

    const mcps = await Promise.all(
      args.mcpIds.map(async (mcpId) => {
        const mcp = await ctx.runQuery(api.routes.mcps.get, {
          mcpId: mcpId,
        });
        if (!mcp) {
          throw new Error("MCP not found");
        }
        return mcp;
      }),
    );

    return mcps;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    command: v.optional(v.string()),
    env: v.optional(v.record(v.string(), v.string())),
    url: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("running"), v.literal("stopped"), v.literal("error")),
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    if (!args.command && !args.url) {
      throw new Error("Command or URL is required");
    }

    const newMCPId = await ctx.db.insert("mcps", {
      name: args.name,
      command: args.command,
      env: args.env,
      url: args.url,
      status: args.status,
      userId: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return newMCPId;
  },
});

export const update = mutation({
  args: {
    mcpId: v.id("mcps"),
    updates: v.object({
      name: v.optional(v.string()),
      command: v.optional(v.string()),
      env: v.optional(v.record(v.string(), v.string())),
      url: v.optional(v.string()),
      status: v.optional(
        v.union(v.literal("running"), v.literal("stopped"), v.literal("error")),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const existingMCP = await ctx.db
      .query("mcps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.mcpId))
      .first();

    if (!existingMCP) {
      throw new Error("MCP not found");
    }

    await ctx.db.patch(args.mcpId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const remove = mutation({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const existingMCP = await ctx.db
      .query("mcps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.mcpId))
      .first();

    if (!existingMCP) {
      throw new Error("MCP not found");
    }

    await ctx.db.delete(args.mcpId);

    return null;
  },
});
