import { query, mutation, action } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";
import { api, internal } from "convex/_generated/api";

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

export const send = action({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const chatInput = await ctx.runQuery(api.routes.chatInput.get, {
      chatId: args.chatId,
    });

    if (!chatInput.text || !chatInput.model) {
      throw new Error("Chat input not found\n" + JSON.stringify(chatInput));
    }

    await ctx.runAction(internal.langchain.index.chat, {
      chatId: args.chatId,
      text: chatInput.text,
      model: chatInput.model,
      agentMode: chatInput.agentMode,
      smortMode: chatInput.smortMode,
      webSearch: chatInput.webSearch,
      projectId: chatInput.projectId,
      excludeDocumentIds: chatInput.projectId ? await ctx.runQuery(api.routes.projectDocuments.getSelected, {
        projectId: chatInput.projectId,
        selected: false,
      }) : undefined,
    });

    return null;
  },
});
