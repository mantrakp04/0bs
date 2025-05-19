"use node";

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

export const getEmbeddings = () =>
  new OpenAIEmbeddings({
    model: "embedding",
    apiKey: "hello-world",
    configuration: {
      baseURL: "http://litellm:4000",
    },
  });

export const getModel = (model: string = "gemini-2.5-flash") =>
  new ChatOpenAI({
    model,
    apiKey: "hello-world",
    configuration: {
      baseURL: "http://litellm:4000",
    },
  });
