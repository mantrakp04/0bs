import { models, type ModelConfig } from "convex/langchain/models";
import { action } from "convex/_generated/server";
import { v } from "convex/values";
import { api } from "convex/_generated/api";

export const getModels = action({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
  },
  handler: async (ctx, args): Promise<{
    selectedModel: ModelConfig;
    models: ModelConfig[];
  }> => {
    const chatInput = await ctx.runQuery(api.chatInput.queries.get, {
      chatId: args.chatId,
    });
    
    let selectedModel = models.find((model) => model.model === chatInput.model);
    if (!selectedModel) {
      selectedModel = models[0];
    }
    return {
      selectedModel,
      models
    }
  },
});