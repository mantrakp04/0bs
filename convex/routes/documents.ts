import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";

export const get = query({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const source = await ctx.db
      .query("documents")
      .withIndex("by_id", (q) => q.eq("_id", args.documentId))
      .first();
    if (!source) {
      throw new Error("Source not found");
    }

    if (source.userId !== user.userId) {
      throw new Error("Unauthorized");
    }

    return source;
  },
});

export const getAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", user.userId))
      .paginate(args.paginationOpts);

    return documents;
  },
});

export const getMultiple = query({
  args: {
    documentIds: v.array(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const sources = await Promise.all(
      args.documentIds.map(async (documentId) => {
        const source = await ctx.db
          .query("documents")
          .withIndex("by_id", (q) => q.eq("_id", documentId))
          .first();
        if (!source) {
          throw new Error("Source not found");
        }

        if (source.userId !== user.userId) {
          throw new Error("Unauthorized");
        }
        return source;
      }),
    );

    return sources;
  },
});

export const getByKey = query({
  args: {
    key: v.union(v.id("_storage"), v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const source = await ctx.db
      .query("documents")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!source) {
      throw new Error("Source not found");
    }

    if (source.userId !== user.userId) {
      throw new Error("Unauthorized");
    }

    return source;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("file"),
      v.literal("url"),
      v.literal("site"),
      v.literal("youtube"),
    ),
    size: v.number(),
    key: v.union(v.id("_storage"), v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const source = await ctx.db.insert("documents", {
      name: args.name,
      type: args.type,
      size: args.size,
      key: args.key,
      userId: user.userId,
    });

    return source;
  },
});

export const remove = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const source = await ctx.db
      .query("documents")
      .withIndex("by_id", (q) => q.eq("_id", args.documentId))
      .first();
    if (!source) {
      throw new Error("Source not found");
    }

    if (source.userId !== user.userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.documentId);

    return true;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const generateDownloadUrl = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});
