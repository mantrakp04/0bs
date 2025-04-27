import { TavilySearch } from "@langchain/tavily";
import { type RunnableConfig } from "@langchain/core/runnables";
import { type AgentState } from "./state";
import { model } from "./model";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { getTools } from "./workers/tools";
import { env } from "@/env";
import { createRetrieverWithFilters } from "./workers/vectorstore";
import { db } from "../db";
import { instructions } from "./types";

const search_tool = new TavilySearch({
  maxResults: 5,
  topic: "general",
  tavilyApiKey: env.TAVILY_API_KEY,
});

// TODO: add memory

export const callReActAgent = async (state: typeof AgentState.State, config: RunnableConfig) => {
  const { messages } = state;
  const { code_interpreter_toolkit } = await getTools(config);

  // Get memory
  const memory = await db.query.userMemory.findFirst({
    where: (userMemory, { eq }) => eq(userMemory.userId, config.configurable?.createdById),
  });
  const parsedMemory = instructions.parse(memory?.memory);

  const agent = createReactAgent({
    llm: model,
    tools: [search_tool, ...code_interpreter_toolkit, ...createRetrieverWithFilters(config)],
    stateModifier: "You are a helpful assistant that provides accurate and concise information." +
      "Additionaly you have access to the following information about the user relevent to the request: " +
      parsedMemory.instructions.map((instruction) => `${instruction.key}: ${instruction.value}`).join("\n")
  });

  const output = await agent.invoke({
    messages: messages
  }, config);

  return { messages: output.messages[output.messages.length - 1] };
}
