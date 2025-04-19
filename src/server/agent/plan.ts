import {
  StateGraph,
  END,
  START
} from "@langchain/langgraph";
import { type RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";
import { AgentState } from "./state";
import { plan, response, replan } from "./types";
import * as prompts from "./prompt";
import { model } from "./model";
import { workflow as supervisorWorkflow } from "./supervisor";

const planStep = async (state: typeof AgentState.State, config: RunnableConfig) => {
  const { messages } = state;

  const input = messages[messages.length - 1]?.content;
  const messagesWithoutInput = messages.slice(0, -1);

  const modelWithTools = prompts.plannerPrompt.pipe(model.withStructuredOutput(plan));
  const response = await modelWithTools.invoke({
    input: input,
    messages: messagesWithoutInput
  }, config);
  return { plan: response.steps };
}

const replanStep = async (state: typeof AgentState.State, config: RunnableConfig) => {
  const { plan, pastSteps } = state;

  const input = pastSteps[pastSteps.length - 1]?.content;
  const modelWithTools = prompts.replannerPrompt.pipe(model.withStructuredOutput(replan));
  const response = await modelWithTools.invoke({
    input: input,
    plan: plan,
    pastSteps: pastSteps
  }, config);
  
  // Handle the response based on the action type
  if ('response' in response.action) {
    return { messages: [new HumanMessage(response.action.response)], respond: true };
  } else {
    return { plan: response.action.steps, respond: false };
  }
}

const shouldContinue = async (state: typeof AgentState.State) => {
  const { respond } = state;
  return respond ? END : "agent";
}

export const workflow = new StateGraph(AgentState)
  .addNode("plan", planStep)
  .addNode("agent", supervisorWorkflow.compile())
  .addNode("replan", replanStep)

  .addEdge(START, "plan")
  .addEdge("plan", "agent")
  .addEdge("agent", "replan")
  .addConditionalEdges("replan", shouldContinue, [END, "agent"])