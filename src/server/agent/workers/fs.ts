import {
  StateGraph,
  END,
  START,
  Command,
} from "@langchain/langgraph";
import { type RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { AgentState } from "../state";
import * as prompts from "../prompt";
import { model } from "../model";
import { getTools } from "./tools";
import { createReactAgent, ToolNode } from '@langchain/langgraph/prebuilt';

const shouldContinue = (state: typeof AgentState.State) => {
  const { fs_messages } = state;
  const lastMessage = fs_messages[fs_messages.length - 1];
  if (lastMessage && "tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
      return "tools";
  }
  return END;
}

const callFsWorkerModel = async (state: typeof AgentState.State, config: RunnableConfig) => {
  const { fs_toolkit } = await getTools(config);
  const { fs_messages } = state;
  const modelWithTools = prompts.fs_prompt.pipe(model.bindTools(fs_toolkit));
  const response = await modelWithTools.invoke({
    messages: [...fs_messages, new HumanMessage(state.instruction)],
  }, config);
  return {
    messages: response,
  };
};

const callFsToolNode = async (state: typeof AgentState.State, config: RunnableConfig) => {
  const { fs_toolkit } = await getTools(config);
  const { fs_messages } = state;
  const response = await (new ToolNode(fs_toolkit)).invoke({
    messages: [fs_messages[fs_messages.length - 1]]
  }, config);
  const toolMessages = response.messages as ToolMessage[];
  for (const toolMessage of toolMessages && toolMessages.length > 0 ? toolMessages : []) {
    if (["file_read", "file_read_image"].includes(toolMessage.name ?? "")) {
      return new Command({
        update: {
          supervisor_messages: [toolMessage]
        },
        goto: "supervisor",
        graph: Command.PARENT
      })
    } else if (toolMessage.name === "file_write" && toolMessage.content === "") {
      return new Command({
        update: {
          fs_messages: [toolMessage]
        },
        goto: "write_file_content"
      })
    } else if (fs_toolkit.map((tool) => tool.name).includes(toolMessage.name ?? "")) {
      return new Command({
        update: {
          fs_messages: [toolMessage]
        },
        goto: "agent",
      })
    } else {
      return new Command({
        update: {
          supervisor_messages: [toolMessage]
        },
        goto: "supervisor",
        graph: Command.PARENT
      })
    }
  }
}

const callWriteFileContent = async (state: typeof AgentState.State, config: RunnableConfig) => {
  const { supervisor_messages, fs_messages } = state;
  const { fs_toolkit } = await getTools(config);

  const writeFileAgent = createReactAgent({
    llm: model,
    tools: fs_toolkit.filter((tool) => tool.name === "file_write"),
    stateModifier: prompts.file_write_prompt
  })

  const output = await writeFileAgent.invoke({
    messages: [...supervisor_messages, ...fs_messages, new HumanMessage(state.instruction)]
  }, config);

  return new Command({
    update: {
      supervisor_messages: [output.messages[output.messages.length - 1]]
    },
    goto: "supervisor",
    graph: Command.PARENT
  });
}

export const workflow = new StateGraph(AgentState).
  addNode("agent", callFsWorkerModel).
  addNode("tools", callFsToolNode, {
    ends: ["write_file_content", "agent", "supervisor"]
  }).
  addNode("write_file_content", callWriteFileContent, {
    ends: ["supervisor"]
  }).
  addEdge(START, "agent").
  addConditionalEdges("agent", shouldContinue, ["tools", END])