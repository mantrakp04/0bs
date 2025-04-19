import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";
import { type RunnableConfig } from "@langchain/core/runnables";
import { type AgentState } from "../state";
import { getTools } from "./tools";
import * as prompts from "../prompt";
import { model } from "../model";

export const callShellWorkerModel = async (state: typeof AgentState.State, config: RunnableConfig) => {
  const { shell_toolkit } = await getTools(config);
  const agent = createReactAgent({ 
    llm: model, 
    tools: shell_toolkit,
    stateModifier: prompts.shell_prompt
  });

  const output = await agent.invoke({
    messages: [new HumanMessage(state.instruction)]
  }, config);

  return {
    supervisor_messages: [output.messages[output.messages.length - 1]]
  };
};
