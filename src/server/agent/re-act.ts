import {
  StateGraph,
  END,
  START
} from "@langchain/langgraph";
import { z } from 'zod';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { TavilySearch } from "@langchain/tavily";
import { Sandbox } from '@e2b/code-interpreter'
import { DynamicStructuredTool } from "@langchain/core/tools";
import { type RunnableConfig } from "@langchain/core/runnables";
import { db } from "@/server/db";
import { chats } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { type MessageContentComplex } from "@langchain/core/messages";
import { AgentState } from "./state";
import { model } from "./model";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const search_tool = new TavilySearch({
  maxResults: 5,
  topic: "general",
  tavilyApiKey: process.env.TAVILY_API_KEY,
});

const e2b_tool = new DynamicStructuredTool({
  name: "e2b_tool",
  description: "Use this tool to run code in stateful python sandbox",
  schema: z.object({
    code: z.string(),
  }),
  func: async ({ code, config }: { code: string, config: RunnableConfig }) => {
    let sandbox: Sandbox;
    if (config.configurable?.ciSandboxId) {
      sandbox = await Sandbox.connect(config.configurable.ciSandboxId, { apiKey: process.env.E2B_API_KEY });
    } else {
      sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY });
      // Update the chat with the new sandbox ID if chatId is provided
      if (config.configurable?.chatId) {
        await db.update(chats)
          .set({
            ciSandboxId: sandbox.sandboxId,
            updatedAt: new Date(),
          })
          .where(eq(chats.id, config.configurable.chatId))
          .execute();
      }
    }

    const result = await sandbox.runCode(code);
    
    // Transform results into MessageContentComplex[]
    const messageContent: MessageContentComplex[] = result.results.map(r => {
      // If there's text content, use it
      if (r.text) {
        return { type: "text", text: r.text };
      }
      // If there's an image (png, jpeg, svg), use it
      if (r.png) {
        return { type: "image_url", image_url: { url: r.png, detail: "high" } };
      }
      if (r.jpeg) {
        return { type: "image_url", image_url: { url: r.jpeg, detail: "high" } };
      }
      if (r.svg) {
        return { type: "image_url", image_url: { url: `data:image/svg+xml;base64,${r.svg}`, detail: "high" } };
      }
      // For other types (html, markdown, etc), convert to text
      return { type: "text", text: String(r.raw) };
    });

    return messageContent;
  },
});

const tools = [search_tool, e2b_tool];

export const callReActAgent = async (state: typeof AgentState.State, config: RunnableConfig) => {
  const { messages } = state;

  const agent = createReactAgent({
    llm: model,
    tools
  });

  const output = await agent.invoke({
    messages: messages
  }, config);

  return { messages: output.messages[output.messages.length - 1] };
}
