import { ChatOpenAI } from "@langchain/openai";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { conn } from "@/server/db";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import type { RunnableConfig } from "@langchain/core/runnables";
import { Sandbox } from '@e2b/code-interpreter'
import type { Document } from '@langchain/core/documents';
import { tool } from "@langchain/core/tools";

const checkpointer = new PostgresSaver(conn);

type AgentProps = {
  model: string;
  files: Document[];
  config: RunnableConfig;
};

export async function createAgent(props: AgentProps) {
  let sbx: Sandbox;
  
  if (!props.config.configurable?.sbx_id) {
    sbx = await Sandbox.create();
    props.config.configurable = {
      ...props.config.configurable,
      sbx_id: sbx.sandboxId,
    };
  } else {
    sbx = await Sandbox.connect(props.config.configurable.sbx_id);
  }

  const graph = createReactAgent({
    tools: [new TavilySearchResults()],
    llm: new ChatOpenAI({
      model: props.model,
    }),
    checkpointSaver: checkpointer,
  });

  return graph;
}
