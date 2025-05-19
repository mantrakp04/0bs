"use node";

import { MultiServerMCPClient, type Connection } from "@langchain/mcp-adapters";
import { api } from "../_generated/api";
import type { ActionCtx } from "convex/_generated/server";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { ToolInputSchemaBase } from "node_modules/@langchain/core/dist/tools/types";

export const getMCPTools = async (ctx: ActionCtx) => {
  const mcps = await ctx.runQuery(api.routes.mcps.getAll, {
    paginationOpts: { numItems: 100, cursor: null },
    filter: {
      status: "running",
    },
  });

  // Start/Run & connect to enabled mcps
  await Promise.all(
    mcps.page.map((mcp) => {
      return ctx.runAction(api.actions.mcps.start, {
        mcpId: mcp._id,
      });
    }),
  );

  const mcpServers: Record<string, Connection> = Object.fromEntries(
    mcps.page
      .filter((mcp) => mcp.url !== undefined)
      .map((mcp) => [
        mcp.name,
        {
          transport: "sse",
          url: mcp.url!,
          headers: mcp.env,
          useNodeEventSource: true,
          reconnect: {
            enabled: true,
            maxAttempts: 2,
            delayMs: 100,
          },
        },
      ]),
  );

  const client = new MultiServerMCPClient({
    throwOnLoadError: true,
    prefixToolNameWithServerName: true,
    additionalToolNamePrefix: "mcp",
    mcpServers,
  });

  const tools = await client.getTools();

  // Group tools by server name
  const groupedTools: Record<
    string,
    StructuredToolInterface<ToolInputSchemaBase>[]
  > = {};

  for (const tool of tools) {
    // Tool names are prefixed with "mcp_serverName_" due to client configuration
    const parts = tool.name.split("_");
    if (parts.length >= 2) {
      // Skip the "mcp" prefix and get the server name
      const serverName = parts[1];
      if (!groupedTools[serverName]) {
        groupedTools[serverName] = [];
      }
      groupedTools[serverName].push(tool);
    }
  }

  return {
    tools,
    groupedTools,
  };
};
