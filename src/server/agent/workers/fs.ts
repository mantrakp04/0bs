import {
  StateGraph,
  END,
  START,
  Command,
} from "@langchain/langgraph";
import { type RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, type ToolMessage } from "@langchain/core/messages";
import { FsState, type SupervisorState } from "../state";
import * as prompts from "../prompt";
import { model } from "../model";
import { getTools } from "./tools";
import { createReactAgent, ToolNode } from '@langchain/langgraph/prebuilt';

const shouldContinue = (state: typeof FsState.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && "tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
      return "tools";
  }
  return END;
}

const callFsWorkerModel = async (state: typeof FsState.State, config: RunnableConfig) => {
  const { fs_toolkit } = await getTools(config);
  const { messages } = state;
  const modelWithTools = prompts.fs_prompt.pipe(model.bindTools(fs_toolkit));
  const response = await modelWithTools.invoke({
    messages: messages,
  }, config);
  return {
    messages: [response],
  };
};

const callFsToolNode = async (state: typeof FsState.State, config: RunnableConfig) => {
  const { fs_toolkit } = await getTools(config);
  const { messages } = state;
  const response = await (new ToolNode(fs_toolkit)).invoke({
    messages: [messages[messages.length - 1]]
  }, config);
  const toolMessages = response.messages as ToolMessage[];
  for (const toolMessage of toolMessages && toolMessages.length > 0 ? toolMessages : []) {
    if (["file_read", "file_read_image"].includes(toolMessage.name ?? "")) {
      return new Command({
        update: {
          messages: [toolMessage]
        },
        goto: END
      })
    } else if (toolMessage.name === "file_write" && toolMessage.content === "") {
      return new Command({
        update: {
          messages: [toolMessage]
        },
        goto: "write_file_content"
      })
    } else if (fs_toolkit.map((tool) => tool.name).includes(toolMessage.name ?? "")) {
      return new Command({
        update: {
          messages: [toolMessage]
        },
        goto: "agent",
      })
    } else {
      return new Command({
        update: {
          messages: [toolMessage]
        },
        goto: END
      })
    }
  }
}

const callWriteFileContent = async (state: typeof FsState.State, config: RunnableConfig) => {
  const { supervisor_messages, messages } = state;
  const { fs_toolkit } = await getTools(config);

  const writeFileAgent = createReactAgent({
    llm: model,
    tools: fs_toolkit.filter((tool) => tool.name === "file_write"),
    stateModifier: prompts.file_write_prompt
  })
  const output = await writeFileAgent.invoke({
    messages: [...supervisor_messages, ...messages, messages[0] as HumanMessage]
  }, config);

  return new Command({
    update: {
      messages: [output.messages[output.messages.length - 1]]
    },
    goto: END
  });
}

export const workflow = new StateGraph(FsState).
  addNode("agent", callFsWorkerModel).
  addNode("tools", callFsToolNode, {
    ends: ["write_file_content", "agent", END]
  }).
  addNode("write_file_content", callWriteFileContent, {
    ends: [END]
  }).
  addEdge(START, "agent").
  addConditionalEdges("agent", shouldContinue, ["tools", END]).
  compile();

export const callFsWorkflow = async (state: typeof SupervisorState.State, config: RunnableConfig) => {
  const { instruction, messages } = state;
  const response = await workflow.invoke({
    messages: [new HumanMessage(instruction)],
    supervisor_messages: messages
  }, config);

  return {
    messages: [response.messages[response.messages.length - 1]]
  }
}
