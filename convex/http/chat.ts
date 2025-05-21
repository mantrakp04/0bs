import { internal } from "../_generated/api";
import { persistentTextStreaming } from "../utils/helpers";
import { httpAction } from "../_generated/server";
import type { StreamId } from "@convex-dev/persistent-text-streaming";
import type { Id } from "convex/_generated/dataModel";

export const chat = httpAction(async (ctx, request) => {
  const body = (await request.json()) as {
    streamId: string;
  };
  const response = await persistentTextStreaming.stream(
    ctx,
    request,
    body.streamId as StreamId,
    async (ctx, _, streamId, chunkAppender) => {
      const { chatInput } = await ctx.runQuery(
        internal.routes.chatInput.getByStreamId,
        {
          streamId: streamId,
        },
      );

      const stream = await ctx.runAction(internal.actions.chat.chat, {
        chatId: chatInput.chatId as Id<"chats">,
      });

      for await (const event of stream) {
        chunkAppender(JSON.stringify(event));
      }
    },
  );

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Vary", "Origin");
  return response;
});
