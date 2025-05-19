"use node";

import { TavilySearch } from "@langchain/tavily";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const getSearchTools = () => {
  const tools: {
    tavily?: TavilySearch;
    duckduckgo: DuckDuckGoSearch;
    crawlWeb: DynamicStructuredTool;
  } = {
    duckduckgo: new DuckDuckGoSearch({ maxResults: 5 }),
    crawlWeb: new DynamicStructuredTool({
      name: "crawlWeb",
      description: "Crawl the web and return the markdown",
      schema: z.object({
        url: z.string().describe("The url to crawl"),
      }),
      func: async ({ url }: { url: string }) => {
        const response = await fetch(
          `http://localhost:5002/crawl/?url=${encodeURIComponent(url)}&max_depth=0`,
        );
        const data = await response.json();
        return data.markdown as string;
      },
    }),
  };

  if (process.env.TAVILY_API_KEY) {
    tools.tavily = new TavilySearch({
      maxResults: 5,
      topic: "general",
      tavilyApiKey: process.env.TAVILY_API_KEY,
    });
  }

  return tools;
};
