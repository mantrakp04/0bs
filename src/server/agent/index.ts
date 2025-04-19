import {
  StateGraph,
  END,
  START
} from "@langchain/langgraph";
import { IndexState } from "./state";
import { callReActAgent } from "./re-act";
import { callPlanAndExecuteAgent } from "./plan";

const routeInitialNode = async (state: typeof IndexState.State) => {
  return state.useManus ? "planAndExecuteAgent" : "reactAgent";
}

const workflow = new StateGraph(IndexState)
  .addNode("router", routeInitialNode)
  .addNode("reactAgent", callReActAgent)
  .addNode("planAndExecuteAgent", callPlanAndExecuteAgent)

  .addEdge(START, "router")

  .addEdge("router", "reactAgent")
  .addEdge("reactAgent", END)

  .addEdge("router", "planAndExecuteAgent")
  .addEdge("planAndExecuteAgent", END)

export const agent = workflow.compile();

const drawableGraph = agent.getGraph();
const image: Blob = await drawableGraph.drawMermaidPng();

const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'workflow.png');
fs.writeFileSync(outputPath, Buffer.from(await image.arrayBuffer()));

console.log(`Workflow graph saved to ${outputPath}`);
