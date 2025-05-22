"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { HumanMessage } from "@langchain/core/messages";
import { internal } from "convex/_generated/api";
import { agentGraph } from "./agent";
import type { ActionCtx } from "convex/_generated/server";
import type { Id } from "convex/_generated/dataModel";

export const chat = internalAction({
  args: {
    text: v.string(),
    model: v.string(),
    chatId: v.id("chats"),
    agentMode: v.optional(v.boolean()),
    smortMode: v.optional(v.boolean()),
    webSearch: v.optional(v.boolean()),
    projectId: v.optional(v.id("projects")),
    excludeDocumentIds: v.optional(v.array(v.id("projectDocuments"))),
  },
  handler: async (ctx, args) => {
    const stream = await streamHelper(ctx, args);

    for await (const event of stream) {
      await ctx.runMutation(internal.routes.chatStream.appendStream, {
        chatId: args.chatId,
        content: JSON.stringify(event),
      });
    }

    return null;
  },
});

async function* streamHelper(ctx: ActionCtx, args: {
  text: string;
  model: string;
  chatId: string;
  agentMode?: boolean;
  smortMode?: boolean;
  webSearch?: boolean;
  projectId?: Id<"projects">;
  excludeDocumentIds?: Id<"projectDocuments">[];
}) {
  const humanMessage = new HumanMessage({
    content: args.text ?? "",
  });

  const response = agentGraph.streamEvents({
    messages: [humanMessage],
  }, {
    version: "v2",
    configurable: {
      ctx,
      model: args.model,
      agentMode: args.agentMode ?? false,
      smortMode: args.smortMode ?? false,
      webSearch: args.webSearch ?? true,
      projectId: args.projectId,
      excludeDocumentIds: args.excludeDocumentIds,
      thread_id: args.chatId,
    },
  });

  for await (const event of response) {
    yield event;
  }
}