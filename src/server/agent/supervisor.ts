import {
  StateGraph,
  END,
  START,
  Command,
  interrupt,
} from "@langchain/langgraph";
import { type RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";
import { AgentState } from "./state";
import { router, step } from "./types";
import * as prompts from "./prompt";
import { model } from "./model";
import { callShellWorkerModel } from "./workers/shell";
import { callBrowserWorkerModel } from "./workers/browser";
import { workflow as fsWorkflow } from "./workers/fs";
import { workflow as vectorstoreWorkflow } from "./workers/vectorstore";

const callSupervisorModel = async (state: typeof AgentState.State, config: RunnableConfig) => {
  const task = state.plan[0];
  if (!task) {
    return {
      next: END,
      instruction: "No tasks remaining in plan"
    };
  }
  const parsedTask = step.parse(task);
  const modelWithTools = prompts.supervisorPrompt.pipe(model.withStructuredOutput(router));
  const response = await modelWithTools.invoke({
    messages: [
      new HumanMessage(
        `Based on this information, which worker should handle this task?
Respond with one of: fs_worker, shell_worker, browser_worker, vectorstore_worker, ask_user or END if complete.
Provide detailed instructions for the selected worker.
Task: ${parsedTask.description}
Substeps: ${parsedTask.substeps.join("\n")}`
      )
    ],
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

const callAskUserModel = async (state: typeof AgentState.State, config: RunnableConfig) => {
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

export const workflow = new StateGraph(AgentState)
  .addNode("supervisor", callSupervisorModel)
  .addNode("browser_worker", callBrowserWorkerModel)
  .addNode("shell_worker", callShellWorkerModel)
  .addNode("vectorstore_worker", vectorstoreWorkflow.compile())
  .addNode("fs_worker", fsWorkflow.compile(), {
    ends: ["supervisor"]
  })
  .addNode("ask_user", callAskUserModel);
  const workers = ["browser_worker", "shell_worker", "vectorstore_worker", "fs_worker", "ask_user"] as const;
  workers.forEach(worker => {
    workflow.addEdge(worker, "supervisor");
  });
  workflow.addEdge(START, "supervisor");