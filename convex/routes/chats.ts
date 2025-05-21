import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { persistentTextStreaming, requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";
import { type StreamId, StreamIdValidator } from "@convex-dev/persistent-text-streaming";
import { api } from "convex/_generated/api";

export const get = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const chat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .first();

    if (!chat) {
      throw new Error("Chat not found");
    }

    return chat;
  },
});

export const getAll = query({
  args: {
    pinned: v.optional(v.boolean()),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const userChats = await ctx.db
      .query("chats")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .filter((q) =>
        args.pinned === undefined ? true : q.eq(q.field("pinned"), args.pinned),
      )
      .order("desc")
      .paginate(args.paginationOpts ?? { numItems: 10, cursor: null });

    return userChats;
  },
});

export const getMultiple = query({
  args: {
    chatIds: v.array(v.id("chats")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    return await Promise.all(
      args.chatIds.map(async (chatId) => {
        const chat = await ctx.db
          .query("chats")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("_id"), chatId))
          .first();

        if (!chat) {
          throw new Error("Chat not found");
        }

        return chat;
      }),
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const newChatId = await ctx.db.insert("chats", {
      name: args.name,
      userId: userId,
      pinned: false,
      updatedAt: Date.now(),
    });
    return newChatId;
  },
});

export const update = mutation({
  args: {
    chatId: v.id("chats"),
    updates: v.object({
      name: v.optional(v.string()),
      pinned: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const { chatId, updates } = args;

    if (Object.keys(updates).length === 0) {
      // No actual updates provided
      return null;
    }

    const existingChat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), chatId))
      .first();

    if (!existingChat) {
      throw new Error("Chat not found");
    }

    await ctx.db.patch(existingChat._id, { ...updates, updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const existingChat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .first();

    if (!existingChat) {
      throw new Error("Chat not found");
    }

    await ctx.db.delete(args.chatId);

    return null;
  },
});

export const send = mutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const streamId = await persistentTextStreaming.createStream(ctx);
    await ctx.runMutation(api.routes.chatInput.update, {
      chatId: args.chatId,
        updates: {
          streamId: streamId,
        },
      });

    return streamId;
  },
});

export const getChatBody = query({
  args: {
    streamId: StreamIdValidator,
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    return await persistentTextStreaming.getStreamBody(ctx, args.streamId as StreamId);
  },
});