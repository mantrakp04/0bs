import { z } from "zod";
import { END } from "@langchain/langgraph";

export const step = z.object({
  description: z.string().describe("A clear description of the step"),
  substeps: z.array(z.string()).describe("1-4 substeps that break down how to accomplish this step, depending on the complexity of the step."),
})

export const plan = z.object({
  steps: z.array(step).describe("A list of high-level sequential steps with detailed expansions"),
});

export const response = z.object({
  response: z.string().describe("Response to user."),
});

export const replan = z.object({
  action: z.union([
    plan,
    response
  ]).describe("Action to perform. If you want to respond to user, use Response." +
    "If you need to further use tools to get the answer, use Plan.")
})

export const router = z.object({
  next: z.enum(["fs_worker", "shell_worker", "browser_worker", "vectorstore_worker", "ask_user", END]).describe("Next worker to route to"),
  instruction: z.string().describe("Instructions for the next worker")
});
