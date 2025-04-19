import {
  StateGraph,
  END,
  START
} from "@langchain/langgraph";
import { type RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";
import { type IndexState, PlanState } from "./state";
import { plan, response, replan, step } from "./types";
import * as prompts from "./prompt";
import { model } from "./model";
import { compiledWorkflow as supervisorWorkflow } from "./supervisor";

const planStep = async (state: typeof PlanState.State, config: RunnableConfig) => {
  const { messages } = state;
  const modelWithTools = prompts.plannerPrompt.pipe(model.withStructuredOutput(plan));
  const response = await modelWithTools.invoke({
    messages: messages
  }, config);
  return { plan: response.steps };
}

const executeStep = async (state: typeof PlanState.State, config: RunnableConfig) => {
  const task = step.parse(state.plan[0]);
  if (!task) {
    return {
      next: END,
      instruction: "No tasks remaining in plan"
    };
  }
  const input = "Based on this information, which worker should handle this task?" +
    `Respond with one of: fs_worker, shell_worker, browser_worker, vectorstore_worker, ask_user or ${String(END)} if complete.` +
    "Provide detailed instructions for the selected worker." +
    `Task: ${task.description}` +
    `Substeps: ${task.substeps.join("\n")}`;
  const messages = [new HumanMessage(input)];
  const response = await supervisorWorkflow.invoke({ messages }, config);
  return {
    pastSteps: [[task, response.messages[response.messages.length - 1]?.content.toString() ?? ""]],
    plan: state.plan.slice(1)
  };
}

const replanStep = async (state: typeof PlanState.State, config: RunnableConfig) => {
  const { plan, pastSteps, messages } = state;

  const modelWithTools = prompts.replannerPrompt.pipe(model.withStructuredOutput(replan));
  const response = await modelWithTools.invoke({
    plan: plan,
    pastSteps: pastSteps.map(([step, result]) => `${step}: ${result}`).join("\n"),
    messages: messages
  }, config);
  
  // Handle the response based on the action type
  if ('response' in response.action) {
    return { response: response.action.response };
  } else {
    return { plan: response.action.steps };
  }
}

const shouldContinue = async (state: typeof PlanState.State) => {
  const { response } = state;
  return response !== "" ? END : "agent";
}

export const workflow = new StateGraph(PlanState)
  .addNode("planner", planStep)
  .addNode("agent", executeStep)
  .addNode("replan", replanStep)

  .addEdge(START, "planner")
  .addEdge("planner", "agent")
  .addEdge("agent", "replan")
  .addConditionalEdges("replan", shouldContinue, [END, "agent"])
  .compile()

export const callPlanAndExecuteAgent = async (state: typeof IndexState.State, config: RunnableConfig) => {
  const { messages } = state;

  const plan = await workflow.invoke({
    messages: messages
  }, config);

  return {
    messages: [new HumanMessage(plan.response)],
  }
}