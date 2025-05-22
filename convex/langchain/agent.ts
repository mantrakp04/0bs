"use node";

import { getModel } from "./models";
import {
  Annotation,
  END,
  messagesStateReducer,
  START,
  StateGraph,
} from "@langchain/langgraph";
import type { DocumentInterface } from "@langchain/core/documents";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { ActionCtx } from "convex/_generated/server";
import {
  BaseMessage,
  SystemMessage,
  HumanMessage,
} from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { z } from "zod";
import type { Id } from "convex/_generated/dataModel";
import { api } from "convex/_generated/api";
import { Document } from "langchain/document";
import { getVectorStore } from "./weaviate";
import type { TavilySearchResponse } from "@langchain/tavily";
import { formatDocumentsAsString } from "langchain/util/document";
import { getSearchTools } from "./get_serch_tool";
import { getMCPTools } from "./get_mcp_tools";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { AIMessage } from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const checkpointer = PostgresSaver.fromConnString(
  "postgresql://postgres:postgres@database:5432",
);
await checkpointer.setup();

// Extend RunnableConfig to include ctx
type ExtendedRunnableConfig = RunnableConfig & {
  ctx: ActionCtx;
  model: string;
  agentMode: boolean;
  smortMode: boolean;
  webSearch: boolean;
  projectId?: Id<"projects">;
  excludeDocumentIds?: Id<"projectDocuments">[];
};

const plan = z
  .array(
    z.object({
      step: z.string().describe("The step to be executed"),
      additional_context: z
        .string()
        .describe("Additional context that may be needed to execute the step"),
    }),
  )
  .describe("A step by step plan to achieve the objective")
  .min(1)
  .max(7);

// Represents the state of our graph.
const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  documents: Annotation<DocumentInterface[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  lastNode: Annotation<Record<string, any>>({
    reducer: (x, y) => y ?? x ?? {},
  }),
  smortPlan: Annotation<z.infer<typeof plan>>({
    reducer: (x, y) => y ?? x ?? [],
  }),
});

async function generateQuery(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
) {
  const promptTemplate = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Determine if the user needs queries for VectorStore, WebSearch, or both. Generate relevant queries.",
    ],
    [
      "human",
      "Give queries for the following: " +
        (config.webSearch ? "WebSearch" : "") +
        (config.projectId ? "VectorStore" : "") +
        ".",
    ],
    new MessagesPlaceholder("messages"),
  ]);
  const modelWithOutputParser = promptTemplate.pipe(
    getModel(config.model).withStructuredOutput(
      z.object({
        vectorStoreQueries: z
          .array(z.string())
          .describe("Queries for the vector database")
          .max(3)
          .min(1)
          .nullable(),
        webSearchQueries: z
          .array(z.string())
          .describe("Queries for web search")
          .max(3)
          .min(1)
          .nullable(),
      }),
    ),
  );

  const queries = await modelWithOutputParser.invoke({
    messages: state.messages.slice(-5),
  });
  return {
    lastNode: queries,
  };
}

async function retrieve(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
) {
  const allDocs: DocumentInterface[] = [];
  
  if (config.projectId && state.lastNode.vectorStoreQueries) {
    const vectorStore = getVectorStore();
    const excludedProjectDocuments = await config.ctx.runQuery(
      api.routes.projectDocuments.getMultiple,
      {
        projectDocumentIds: config.excludeDocumentIds ?? [],
      },
    );

    await Promise.all(
      state.lastNode.vectorStoreQueries.map(async (node: string) => {
        const docs = await vectorStore.similaritySearch(node, 3, {
          where: {
            operator: "And" as const,
            operands: [
              {
                operator: "Equal" as const,
                path: ["projectId"],
                valueText: config.projectId,
              },
              ...excludedProjectDocuments.map((doc) => ({
                operator: "NotEqual" as const,
                path: ["source"],
                valueText: doc.documentId,
              })),
            ],
          },
        });
        allDocs.push(...docs);
      }),
    );
  }
  
  if (config.webSearch && state.lastNode.webSearchQueries) {
    const searchTools = await getSearchTools();
    await Promise.all(
      state.lastNode.webSearchQueries.map(async (node: string) => {
        if (searchTools.tavily) {
          const searchResults = (await searchTools.tavily._call({
            query: node,
            topic: "general",
            includeImages: false,
            includeDomains: [],
            excludeDomains: [],
            searchDepth: "basic",
          })) as TavilySearchResponse;
          const docs = searchResults.results.map((result) => {
            return new Document({
              pageContent: `${result.score}. ${result.title}\n${result.url}\n${result.content}`,
              metadata: {
                source: "tavily",
              },
            });
          });
          allDocs.push(...docs);
        } else {
          const searchResults = await searchTools.duckduckgo._call(node);
          const searchResultsArray: {
            title: string;
            url: string;
            snippet: string;
          }[] = JSON.parse(searchResults);
          const urlMarkdownContents = await Promise.all(
            searchResultsArray.map(
              (result) =>
                searchTools.crawlWeb.func({
                  url: result.url,
                }) as Promise<string>,
            ),
          );
          const docs = searchResultsArray.map((result, index) => {
            return new Document({
              pageContent: `${result.title}\n${result.url}\n${urlMarkdownContents[index]}`,
              metadata: {
                source: "duckduckgo",
              },
            });
          });
          allDocs.push(...docs);
        }
      }),
    );
  }
  
  return { documents: allDocs };
}

async function gradeDocuments(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
) {
  const promptTemplate = ChatPromptTemplate.fromTemplate(
    `You are a grader assessing relevance of a retrieved document to a user question.
        Here is the retrieved document:

        {context}

        Here is the conversation history (focus on the last message as the question):
        {messages}

        If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant.
        Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question.`,
  );

  const modelWithOutputParser = promptTemplate.pipe(
    getModel(config.model).withStructuredOutput(
      z
        .object({
          binaryScore: z
            .enum(["yes", "no"])
            .describe("Relevance score 'yes' or 'no'"),
        })
        .describe(
          "Grade the relevance of the retrieved documents to the question. Either 'yes' or 'no'.",
        ),
    ),
  );

  const relevantDocs: DocumentInterface[] = [];

  // Grade each document for relevance
  await Promise.all(
    state.documents.map(async (doc) => {
      const grade = await modelWithOutputParser.invoke({
        context: doc.pageContent,
        messages: state.messages.slice(-3),
      });

      if (grade.binaryScore === "yes") {
        relevantDocs.push(doc);
      }
    }),
  );

  return {
    documents: relevantDocs,
  };
}

async function shouldPlan(
  state: typeof GraphState.State,
  options: Record<string, any>,
) {
  const config = {
    ...options,
    ...options.configurable,
  } as ExtendedRunnableConfig;
  return config.smortMode ? "true" : "false";
}

async function agent(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
) {
  const promptTemplate = ChatPromptTemplate.fromMessages([
    new SystemMessage(
      `You are 0bs Chat, an AI assistant powered by the ${config.model} model. ` +
        `Your role is to assist and engage in conversation while being helpful, respectful, and engaging.\n` +
        `- If you are specifically asked about the model you are using, you may mention that you use the ${config.model} model. If you are not asked specifically about the model you are using, you do not need to mention it.\n` +
        `- The current date and time is ${new Date().toLocaleString()}.\n` +
        `- Always use LaTeX for mathematical expressions.\n` +
        `   - Inline math must be wrapped in escaped parentheses: \( content \).\n` +
        `   - Do not use single dollar signs for inline math.\n` +
        `   - Display math must be wrapped in double dollar signs: $$ content $$.\n` +
        `- When generating code:\n` +
        `   - Ensure it is properly formatted using Prettier with a print width of 80 characters\n` +
        `   - Present it in Markdown code blocks with the correct language extension indicated\n`,
    ),
    ...(state.documents.length > 0
      ? [
          new HumanMessage(
            "Here are the documents that are relevant to the question: " +
              formatDocumentsAsString(state.documents),
          ),
        ]
      : []),
    new MessagesPlaceholder("messages"),
  ]);

  const tools = await getMCPTools(config.ctx);
  const searchTools = await getSearchTools();

  let agent;
  if (!config.agentMode) {
    agent = createReactAgent({
      llm: getModel(config.model),
      tools: [
        ...tools.tools,
        ...(searchTools.tavily ? [searchTools.tavily] : []),
        ...(searchTools.duckduckgo
          ? [searchTools.duckduckgo, searchTools.crawlWeb]
          : []),
      ],
      prompt: promptTemplate,
    });
  } else {
    // map tools.groupedTools to a list of createReactAgents with the same prompt
    // create a group of react agents with `You are a ${groupName} assistant` prompt
    const agents = Object.entries(tools.groupedTools).map(
      ([groupName, tools]) =>
        createReactAgent({
          llm: getModel(config.model),
          tools,
          prompt: new SystemMessage(`You are a ${groupName} assistant`),
        }),
    );

    agent = createSupervisor({
      agents,
      tools: [],
      llm: getModel(config.model),
      prompt:
        `You are 0bs Chat, an AI assistant powered by the ${config.model} model. ` +
        `Your role is to analyze the user's request and determine a plan of action to take. Assign each plan step to the appropriate agent, one at a time.\n`,
    }).compile();
  }

  const response = await agent.invoke(
    {
      messages: state.messages,
    },
    config,
  );

  const newMessages = response.messages.slice(
    state.messages.length,
    response.messages.length,
  );

  return {
    messages: newMessages,
  };
}

async function smortPlanner(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
) {
  const promptTemplate = ChatPromptTemplate.fromMessages([
    [
      "system",
      `For the given objective, come up with a simple step by step plan.\n` +
        `This plan should involve individual tasks, that if executed correctly will yield the correct answer. Do not add any superfluous steps.\n` +
        `The result of the final step should be the final answer. Make sure that each step has all the information needed - do not skip steps.\n`,
    ],
    new MessagesPlaceholder("messages"),
  ]);

  const modelWithOutputParser = promptTemplate.pipe(
    getModel(config.model).withStructuredOutput(plan),
  );

  const response = await modelWithOutputParser.invoke({
    messages: state.messages[state.messages.length - 1],
  });

  return {
    smortPlan: response,
  };
}

async function smortAgent(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
) {
  // If there's no plan or it's empty, return early
  if (!state.smortPlan || state.smortPlan.length === 0) {
    return {};
  }

  const currentTask = state.smortPlan[0];
  const remainingPlan = state.smortPlan.slice(1);

  const promptTemplate = ChatPromptTemplate.fromMessages([
    new SystemMessage(
      `You are 0bs Chat, an AI assistant powered by the ${config.model} model. ` +
        `Your role is to complete the following specific task:\n` +
        `${currentTask.step}\n\n` +
        `Additional Context: ${currentTask.additional_context}\n\n` +
        `- If you are specifically asked about the model you are using, you may mention that you use the ${config.model} model.\n` +
        `- The current date and time is ${new Date().toLocaleString()}.\n` +
        `- Always use LaTeX for mathematical expressions.\n` +
        `   - Inline math must be wrapped in escaped parentheses: \( content \).\n` +
        `   - Do not use single dollar signs for inline math.\n` +
        `   - Display math must be wrapped in double dollar signs: $$ content $$.\n` +
        `- When generating code:\n` +
        `   - Ensure it is properly formatted using Prettier with a print width of 80 characters\n` +
        `   - Present it in Markdown code blocks with the correct language extension indicated\n`,
    ),
    ...(state.documents.length > 0
      ? [
          new HumanMessage(
            "Here are the documents that are relevant to the question: " +
              formatDocumentsAsString(state.documents),
          ),
        ]
      : []),
    new MessagesPlaceholder("messages"),
  ]);

  const tools = await getMCPTools(config.ctx);
  const searchTools = await getSearchTools();

  let agent;
  if (!config.agentMode) {
    agent = createReactAgent({
      llm: getModel(config.model),
      tools: [
        ...tools.tools,
        ...(searchTools.tavily ? [searchTools.tavily] : []),
        ...(searchTools.duckduckgo
          ? [searchTools.duckduckgo, searchTools.crawlWeb]
          : []),
      ],
      prompt: promptTemplate,
    });
  } else {
    const agents = Object.entries(tools.groupedTools).map(
      ([groupName, tools]) =>
        createReactAgent({
          llm: getModel(config.model),
          tools,
          prompt: new SystemMessage(
            `You are a ${groupName} assistant focused on completing this task: ${currentTask.step}`,
          ),
        }),
    );

    agent = createSupervisor({
      agents,
      tools: [],
      llm: getModel(config.model),
      prompt:
        `You are 0bs Chat, an AI assistant powered by the ${config.model} model. ` +
        `Your role is to complete this specific task: ${currentTask.step}\n` +
        `Additional Context: ${currentTask.additional_context}\n`,
    }).compile();
  }

  const response = await agent.invoke(
    {
      messages: state.messages,
    },
    config,
  );

  const newMessages = response.messages.slice(-1).map((message) => {
    message.response_metadata["smortPlanSteps"] = currentTask;
    return message;
  });

  return {
    messages: newMessages,
    smortPlan: remainingPlan,
  };
}

async function smortReplan(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
) {
  const promptTemplate = ChatPromptTemplate.fromTemplate(
    `For the given objective, come up with a simple step by step plan. ` +
      `This plan should involve individual tasks that, if executed correctly, will yield the correct answer. Do not add any superfluous steps. ` +
      `The result of the final step should be the final answer. Make sure that each step has all the information needed - do not skip steps.\n\n` +
      `Your objective was this:` +
      new MessagesPlaceholder("input") +
      "\n\n" +
      `Your original plan was this:\n{plan}\n\n` +
      `You have currently done the following steps:\n{pastSteps}\n\n` +
      `Update your plan accordingly. If no more steps are needed and you can return to the user, then respond with that and use the 'response' function. ` +
      `Otherwise, fill out the plan. Only add steps to the plan that still NEED to be done. Do not return previously done steps as part of the plan.`,
  );

  const outputParser = z.union([
    plan,
    z.object({
      response: z.string().describe("The response to the user"),
    }),
  ]);

  const modelWithOutputParser = promptTemplate.pipe(
    getModel(config.model).withStructuredOutput(outputParser),
  );

  // Past steps are mapped as: `Step {index}: {step}\nAdditional Context: {additional_context}\nResponse: {content}`
  // Find messages with the response_metadata["smortPlanSteps"] and format them as above
  const pastSteps = state.messages
    .filter((message) => message.response_metadata["smortPlanSteps"])
    .map((message, index) => {
      return `Step ${index}: ${message.response_metadata["smortPlanSteps"].step}\nAdditional Context: ${message.response_metadata["smortPlanSteps"].additional_context}\nResponse: ${message.content}`;
    })
    .join("\n");

  const response = await modelWithOutputParser.invoke({
    input: state.messages[state.messages.length - 1],
    plan: state.smortPlan,
    pastSteps: pastSteps,
  });

  if (typeof response === "object" && "response" in response) {
    return {
      messages: [
        new AIMessage(response.response, {
          response_metadata: {
            smortPlanSteps: {
              step: "Response",
            },
          },
        }),
      ],
    };
  } else {
    return {
      smortPlan: response,
    };
  }
}

function smortShouldEnd(state: typeof GraphState.State) {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.response_metadata["smortPlanSteps"]?.step === "Response") {
    return "true";
  }
  return "false";
}

// Add these wrappers before the smortGraph definition
const wrapNodeFunction = <T extends Record<string, any>>(
  fn: (
    state: typeof GraphState.State,
    config: ExtendedRunnableConfig,
  ) => Promise<T>,
) => {
  return async (
    state: typeof GraphState.State,
    options: Record<string, any>,
  ) => {
    // Extract the configurable object which contains our custom properties
    const config = {
      ...options,
      ...options.configurable,
    } as ExtendedRunnableConfig;
    return fn(state, config);
  };
};

export const agentGraph = new StateGraph(GraphState)
  .addNode("generateQuery", wrapNodeFunction(generateQuery))
  .addNode("retrieve", wrapNodeFunction(retrieve))
  .addNode("gradeDocuments", wrapNodeFunction(gradeDocuments))
  .addNode("agent", wrapNodeFunction(agent))
  .addNode("smortPlanner", wrapNodeFunction(smortPlanner))
  .addNode("smortAgent", wrapNodeFunction(smortAgent))
  .addNode("smortReplan", wrapNodeFunction(smortReplan))
  .addEdge(START, "generateQuery")
  .addEdge("generateQuery", "retrieve")
  .addEdge("retrieve", "gradeDocuments")
  .addConditionalEdges("gradeDocuments", shouldPlan, {
    true: "smortPlanner",
    false: "agent",
  })

  .addEdge("smortPlanner", "smortAgent")
  .addEdge("smortAgent", "smortReplan")
  .addConditionalEdges("smortReplan", smortShouldEnd, {
    true: END,
    false: "smortAgent",
  })

  .addEdge("agent", END)
  .compile({
    checkpointer: checkpointer,
  });
