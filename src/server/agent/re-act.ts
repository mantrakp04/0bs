import { TavilySearch } from "@langchain/tavily";
import { type RunnableConfig } from "@langchain/core/runnables";
import { type AgentState } from "./state";
import { model } from "./model";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { getTools } from "./workers/tools";
import { env } from "@/env";

const search_tool = new TavilySearch({
  maxResults: 5,
  topic: "general",
  tavilyApiKey: env.TAVILY_API_KEY,
});

// TODO: add retriver toolkit, memory

export const callReActAgent = async (state: typeof AgentState.State, config: RunnableConfig) => {
  const { messages } = state;
  const { code_interpreter_toolkit } = await getTools(config);

  const agent = createReactAgent({
    llm: model,
    tools: [search_tool, ...code_interpreter_toolkit],
    stateModifier: "You are a helpful assistant that provides accurate and concise information." // system prompt here
  });

  const output = await agent.invoke({
    messages: messages
  }, config);

  return { messages: output.messages[output.messages.length - 1] };
}
