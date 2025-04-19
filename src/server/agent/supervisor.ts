import {
  StateGraph,
  END,
  START,
  Command,
  interrupt,
} from "@langchain/langgraph";
import { type RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";
import { SupervisorState } from "./state";
import { router } from "./types";
import * as prompts from "./prompt";
import { model } from "./model";
import { callShellWorker } from "./workers/shell";
import { callBrowserWorker } from "./workers/browser";
import { callFsWorkflow } from "./workers/fs";
import { callVectorstoreWorkflow } from "./workers/vectorstore";

const callSupervisor = async (state: typeof SupervisorState.State, config: RunnableConfig) => {
  const modelWithTools = prompts.supervisorPrompt.pipe(model.withStructuredOutput(router));
  const response = await modelWithTools.invoke({
    messages: state.messages,
  }, config);

  const goto = response.next;

  if (goto === END) {
    return new Command({
      goto,
      update: {
        next: END,
        instruction: "No tasks remaining in plan"
      }
    })
  }

  return new Command({
    goto,
    update: {
      next: goto,
      instruction: response.instruction
    }
  })
}

const callAskUserModel = async (state: typeof SupervisorState.State, config: RunnableConfig) => {
  // Get the instruction from the state
  const { instruction } = state;
  
  // Use interrupt to pause execution and wait for user input
  const userResponse = interrupt({
    question: instruction,
    state: state
  });

  // Return a command to go back to the supervisor with the user's response
  return new Command({
    goto: "supervisor",
    update: {
      supervisor_messages: [new HumanMessage(userResponse)],
      next: "supervisor"
    }
  });
};

const workers = ["browser_worker", "shell_worker", "vectorstore_worker", "fs_worker", "ask_user"] as const;

export const workflow = new StateGraph(SupervisorState)
  .addNode("supervisor", callSupervisor, {
    ends: ["browser_worker", "shell_worker", "vectorstore_worker", "fs_worker", "ask_user", END]
  })
  .addNode("browser_worker", callBrowserWorker)
  .addNode("shell_worker", callShellWorker)
  .addNode("vectorstore_worker", callVectorstoreWorkflow)
  .addNode("fs_worker", callFsWorkflow, {
    ends: ["supervisor"]
  })
  .addNode("ask_user", callAskUserModel);
  workers.forEach(worker => {
    workflow.addEdge(worker, "supervisor");
  });
  workflow.addEdge(START, "supervisor")

export const compiledWorkflow = workflow.compile();