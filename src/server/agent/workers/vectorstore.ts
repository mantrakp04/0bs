import { vectorStore } from "@/server/api/routers/projects/sources"
import { createRetrieverTool } from "langchain/tools/retriever";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { VectorstoreState, type SupervisorState } from "../state";
import { START, END, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { model } from "../model";
import * as prompts from "../prompt";
import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";

const retriever = vectorStore.asRetriever();

const tool = createRetrieverTool(
  retriever,
  {
    name: "vectorstore",
    description: "Use this tool to search the vector store for relevant information",
  }
);

const tools = [tool];

const toolNode = new ToolNode<typeof VectorstoreState.State>(tools);

function shouldRetrieve(state: typeof VectorstoreState.State): string {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  if (lastMessage && "tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length) {
    return "retrieve";
  }
  return END;
}

async function gradeDocuments(state: typeof VectorstoreState.State, config: RunnableConfig) {
  const { messages } = state;
  const modelWithTools = prompts.relevancePrompt.pipe(model.withStructuredOutput(z.object({
    binaryScore: z.enum(["yes", "no"]).describe("Relevance score 'yes' or 'no'"),
  })));
  const lastMessage = messages[messages.length - 1];
  const score = await modelWithTools.invoke({
    query: messages[0]?.content,
    documents: lastMessage?.content,
  }, config)

  return {
    binary_scores: score.binaryScore
  }
}

function shouldRewrite(state: typeof VectorstoreState.State) {
  const { binary_scores } = state;
  const lastScore = binary_scores[binary_scores.length - 1];
  return lastScore === "no" ? "rewrite" : "generateAnswer";
}

async function agent(state: typeof VectorstoreState.State, config: RunnableConfig) {
  const { messages } = state;
  const modelWithTools = model.bindTools([toolNode])
  const response = await modelWithTools.invoke(messages, config)

  return {
    messages: [response]
  }
}

async function rewrite(state: typeof VectorstoreState.State, config: RunnableConfig) {
  const { messages } = state;
  const modelWithTools = prompts.rewriteQueryPrompt.pipe(model.withStructuredOutput(z.object({
    rewrittenQuery: z.string().describe("Rewritten query")
  })));
  const response = await modelWithTools.invoke({
    query: messages[0]?.content,
  }, config)

  return {
    messages: [response]
  }
}

async function generateAnswer(state: typeof VectorstoreState.State, config: RunnableConfig) {
  const { messages } = state;
  const question = messages[0]?.content;
  const lastToolMessage = messages.slice().reverse().find((msg) => msg._getType() === "tool");
  const documents = lastToolMessage?.content;
  const modelWithTools = prompts.generateAnswerPrompt.pipe(model.withStructuredOutput(z.object({
    answer: z.string().describe("Answer to the question")
  })));
  const response = await modelWithTools.invoke({
    query: question,
    documents: documents,
    sourcesText: state.sources.join("\n")
  }, config)

  return {
    messages: [response]
  }
}

export const workflow = new StateGraph(VectorstoreState)
  .addNode("agent", agent)
  .addNode("retrieve", toolNode)
  .addNode("gradeDocuments", gradeDocuments)
  .addNode("rewrite", rewrite)
  .addNode("generateAnswer", generateAnswer)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldRetrieve)
  .addEdge("retrieve", "gradeDocuments")
  .addConditionalEdges("gradeDocuments", shouldRewrite)
  .addEdge("rewrite", "generateAnswer")
  .compile();

export const callVectorstoreWorkflow = async (state: typeof SupervisorState.State, config: RunnableConfig) => {
  const { instruction } = state;
  const response = await workflow.invoke({
    messages: [new HumanMessage(instruction)]
  }, config);

  return {
    messages: [response.messages[response.messages.length - 1]]
  }
}