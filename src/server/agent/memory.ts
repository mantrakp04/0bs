import { type RunnableConfig } from "@langchain/core/runnables";
import { db } from "@/server/db";
import { learningAssistantPrompt } from "./prompt";
import { model } from "@/server/agent/model";
import { eq } from "drizzle-orm";
import { userMemory } from "../db/schema";
import { IndexState } from "./state";
import { instructions, addOrRemoveOrOverwriteInstruction } from "./types";

export const updateMemoryNode = async (state: typeof IndexState.State, config: RunnableConfig) => {
  const userId = config.configurable?.createdById;
  if (!userId) {
    throw new Error("User ID is required");
  }

  const memory = await db.query.userMemory.findFirst({
    where: (userMemory, { eq }) => eq(userMemory.userId, userId),
  });

  const formattedMemory = instructions.parse(memory?.memory);

  if (memory) {
    const prompt = await learningAssistantPrompt.format({
      currentInstructions: formattedMemory.instructions.map((m) => `${m}\n`),
      messages: state.messages,
    });

    const modelWithStructuredOutput = model.withStructuredOutput(addOrRemoveOrOverwriteInstruction);
    const response = await modelWithStructuredOutput.invoke(prompt);
    const parsedResponse = addOrRemoveOrOverwriteInstruction.parse(response);

    if (parsedResponse.addOrRemoveOrOverwrite === "add") {
      const newKey = `${Math.random().toString(36).substring(2, 8)}-${Date.now()}`;
      formattedMemory.instructions.push({
        key: newKey,
        value: parsedResponse.instruction
      });
    } else if (parsedResponse.addOrRemoveOrOverwrite === "remove") {
      formattedMemory.instructions = formattedMemory.instructions.filter(
        instruction => instruction.key !== parsedResponse.key
      );
    } else if (parsedResponse.addOrRemoveOrOverwrite === "overwrite") {
      if (!parsedResponse.key) {
        throw new Error("Key is required");
      }

      formattedMemory.instructions = [{
        key: parsedResponse.key,
        value: parsedResponse.instruction
      }];
    }

    await db.update(userMemory)
      .set({ 
        memory: JSON.stringify(formattedMemory) as any,
        updatedAt: new Date()
      })
      .where(eq(userMemory.id, memory.id));

    return { formattedMemory };
  }
}
