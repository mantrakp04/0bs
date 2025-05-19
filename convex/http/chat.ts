import { api } from "../_generated/api";
import { persistentTextStreaming } from "../utils/helpers";
import { httpAction } from "../_generated/server";
import type { StreamId } from "@convex-dev/persistent-text-streaming";
import type { Id } from "convex/_generated/dataModel";

export const chat = httpAction(async (ctx, request) => {
  const body = (await request.json()) as {
    streamId: string;
    chatId: string;
  };
  const response = await persistentTextStreaming.stream(
    ctx,
    request,
    body.streamId as StreamId,
    async (ctx, _, __, chunkAppender) => {
      const stream = await ctx.runAction(api.actions.chat.chat, {
        chatId: body.chatId as Id<"chats">,
      });

      for await (const event of stream) {
        chunkAppender(JSON.stringify(event));
      }
    },
  );
  return response;
});
