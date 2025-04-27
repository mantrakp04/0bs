import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { agent } from "@/server/agent";
import { HumanMessage } from "@langchain/core/messages";
import { convertS3KeysToDocuments } from "@/server/api/routers/projectSource";

export const agentRouter = createTRPCRouter({
  stream: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        input: z.string().optional(),
        sourceKeys: z.array(z.string()).optional(),
        useManus: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      // find chat by id & user
      const chat = await ctx.db.query.chats.findFirst({
        where: (chats, { eq }) => eq(chats.id, input.chatId),
      });

      if (!chat) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Chat not found" });
      }

      if (chat.createdById !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this chat",
        });
      }

      const result = agent.streamEvents(
        {
          useManus: input.useManus,
          messages: [
            new HumanMessage({
              content: [
                ...(input.sourceKeys
                  ? await convertS3KeysToDocuments(input.sourceKeys, [], {
                      db: ctx.db,
                    })
                  : []
                ).map((doc) => ({
                  type: "text",
                  text: `${doc.metadata.name}\n${doc.pageContent}\n\n`,
                })),
                {
                  type: "text",
                  text: input.input ?? "",
                },
              ],
            }),
          ],
        },
        {
          version: "v2",
          configurable: {
            thread_id: input.chatId,
            ...chat,
          },
        },
      );

      return result;
    }),

  getState: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        getHistory: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const chat = await ctx.db.query.chats.findFirst({
        where: (chats, { eq }) => eq(chats.id, input.chatId),
      });

      if (!chat) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Chat not found" });
      }

      if (chat.createdById !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this chat",
        });
      }

      const config = {
        configurable: {
          thread_id: input.chatId,
        },
      };
      if (input.getHistory) {
        const stateHistory = agent.getStateHistory(config);
        return stateHistory;
      }
      const state = await agent.getState(config);
      return state;
    }),
});
