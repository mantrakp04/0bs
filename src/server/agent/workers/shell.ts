import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";
import { type RunnableConfig } from "@langchain/core/runnables";
import { type SupervisorState } from "../state";
import { getTools } from "./tools";
import * as prompts from "../prompt";
import { model } from "../model";

export const callShellWorker = async (state: typeof SupervisorState.State, config: RunnableConfig) => {
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
    messages: [output.messages[output.messages.length - 1]]
  };
};
