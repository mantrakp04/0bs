"use node";

import { action } from "convex/_generated/server";
import { load } from "js-yaml";
import fs from "fs";
import { v } from "convex/values";
import { requireAuth } from "convex/utils/helpers";
import { api } from "convex/_generated/api";

export type ModelList = {
  model_list: {
    model_name: string;
    litellm_params: {
      model: string;
      api_key?: string;
      tags?: string[];
    };
    api_key?: string;
    tags?: string[];
  }[];
};

export type GetModelResult = {
  config: ModelList;
  selectedModel: string;
};

export const getModel = action({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
  },
  handler: async (ctx, args): Promise<GetModelResult> => {
    await requireAuth(ctx);

    const chatInput = await ctx.runQuery(api.routes.chatInput.get, {
      chatId: args.chatId,
    });

    if (!chatInput) {
      throw new Error("Chat input not found");
    }

    let selectedModel = chatInput.model;

    const config = load(
      fs.readFileSync("./litellm_config.yaml", "utf8"),
    ) as ModelList;
    const defaultModel = config.model_list[0].model_name;

    if (!selectedModel) {
      selectedModel = defaultModel;
    }

    return {
      config,
      selectedModel,
    };
  },
});
