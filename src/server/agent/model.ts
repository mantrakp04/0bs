import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { TaskType } from "@google/generative-ai";
import { env } from "@/env";

export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
  apiKey: env.GOOGLE_GENAI_API_KEY,
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: "Document title",
});

export const model = new ChatOpenAI({
  model: "google/gemini-2.5-flash-preview",
  temperature: 0.3,
  apiKey: env.OPENROUTER_API_KEY || "dummy-key",
  configuration: {
    baseURL: "https://openrouter.ai/api/v1"
  }
})