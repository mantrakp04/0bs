import {
  StateGraph,
  END,
  START,
  Command
} from "@langchain/langgraph";
import { IndexState } from "./state";
import { callReActAgent } from "./re-act";
import { callPlanAndExecuteAgent } from "./plan";
import { HumanMessage } from "@langchain/core/messages";

const routeInitialNode = async (state: typeof IndexState.State) => {
  const nextNode = state.useManus ? "planAndExecuteAgent" : "reactAgent";
  return new Command({
    goto: nextNode
  });
}

const workflow = new StateGraph(IndexState)
  .addNode("router", routeInitialNode, { ends: ["reactAgent", "planAndExecuteAgent"] })
  .addNode("reactAgent", callReActAgent, { ends: [END] })
  .addNode("planAndExecuteAgent", callPlanAndExecuteAgent, { ends: [END] })

  .addEdge(START, "router")

export const agent = workflow.compile();

export const testAgent = async () => {
  const result = await agent.streamEvents({
    useManus: false,
    messages: [
      new HumanMessage("Analyze tesla stock and make a linear prediction for the next 5 days, use yfinance n the e2b_tool to run python code")
    ]
  },{
    version: "v2",
    configurable: {
      thread_id: "test1234"
    }
  })

  for await (const event of result) {
    console.log(`${event.event}: ${event.name}`)
    if (event.event === "on_chat_model_end") {
      console.log(event.data.output.content)
    }
  }
}
