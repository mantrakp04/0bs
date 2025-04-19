import {
  StateGraph,
  END,
  START
} from "@langchain/langgraph";
import { AgentState } from "./state";
import { callReActAgent } from "./re-act";
import { workflow as planWorkflow } from "./plan";

const routeInitialNode = async (state: typeof AgentState.State) => {
  return state.useManus ? "planExecuteAgent" : "reactAgent";
}

const workflow = new StateGraph(AgentState)
  .addNode("router", routeInitialNode)
  .addNode("reactAgent", callReActAgent)
  .addNode("planExecuteAgent", planWorkflow.compile())

  .addEdge(START, "router")

  .addEdge("router", "reactAgent")
  .addEdge("reactAgent", END)

  .addEdge("router", "planExecuteAgent")
  .addEdge("planExecuteAgent", END)

export const agent = workflow.compile();

const drawableGraph = agent.getGraph();
const image: Blob = await drawableGraph.drawMermaidPng();

const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'workflow.png');
fs.writeFileSync(outputPath, Buffer.from(await image.arrayBuffer()));

console.log(`Workflow graph saved to ${outputPath}`);
