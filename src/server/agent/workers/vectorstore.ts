import { vectorStore } from "@/server/api/routers/projects/sources"
import { createRetrieverTool } from "langchain/tools/retriever";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AgentState } from "../state";
import { START, END, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { model } from "../model";
import * as prompts from "../prompt";
import type { RunnableConfig } from "@langchain/core/runnables";

const retriever = vectorStore.asRetriever();

const tool = createRetrieverTool(
  retriever,
  {
    name: "vectorstore",
    description: "Use this tool to search the vector store for relevant information",
  }
);

const tools = [tool];

const toolNode = new ToolNode<typeof AgentState.State>(tools);

function shouldRetrieve(state: typeof AgentState.State): string {
  const { vectorstore_messages } = state;
  const lastMessage = vectorstore_messages[vectorstore_messages.length - 1];

  if (lastMessage && "tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length) {
    return "retrieve";
  }
  return END;
}

async function gradeDocuments(state: typeof AgentState.State, config: RunnableConfig) {
  const { vectorstore_messages } = state;
  const modelWithTools = prompts.relevancePrompt.pipe(model.withStructuredOutput(z.object({
    binaryScore: z.enum(["yes", "no"]).describe("Relevance score 'yes' or 'no'"),
  })));
  const lastMessage = vectorstore_messages[vectorstore_messages.length - 1];
  const score = await modelWithTools.invoke({
    query: vectorstore_messages[0]?.content,
    documents: lastMessage?.content,
  }, config)

  return {
    binary_scores: score.binaryScore
  }
}

function shouldRewrite(state: typeof AgentState.State) {
  const { binary_scores } = state;
  const lastScore = binary_scores[binary_scores.length - 1];
  return lastScore === "no" ? "rewrite" : "generateAnswer";
}

async function agent(state: typeof AgentState.State, config: RunnableConfig) {
  const { vectorstore_messages } = state;
  const modelWithTools = model.bindTools([toolNode])
  const response = await modelWithTools.invoke(vectorstore_messages, config)

  return {
    vectorstore_messages: [response]
  }
}

async function rewrite(state: typeof AgentState.State, config: RunnableConfig) {
  const { vectorstore_messages } = state;
  const modelWithTools = prompts.rewriteQueryPrompt.pipe(model.withStructuredOutput(z.object({
    rewrittenQuery: z.string().describe("Rewritten query")
  })));
  const response = await modelWithTools.invoke({
    query: vectorstore_messages[0]?.content,
  }, config)

  return {
    vectorstore_messages: [response]
  }
}

async function generateAnswer(state: typeof AgentState.State, config: RunnableConfig) {
  const { vectorstore_messages } = state;
  const question = vectorstore_messages[0]?.content;
  const lastToolMessage = vectorstore_messages.slice().reverse().find((msg) => msg._getType() === "tool");
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
    vectorstore_messages: [response]
  }
}

export const workflow = new StateGraph(AgentState)
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
