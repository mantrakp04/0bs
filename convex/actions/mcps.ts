"use node";

import { api } from "convex/_generated/api";
import { action } from "../_generated/server";
import { v } from "convex/values";
import Dockerode from "dockerode";
import { requireAuth } from "convex/utils/helpers";
import type { Id } from "convex/_generated/dataModel";

const docker = new Dockerode();

export const start = action({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const mcp = await ctx.runQuery(api.routes.mcps.get, {
      mcpId: args.mcpId,
    });
    if (!mcp) {
      throw new Error("MCP not found");
    }
    if (!mcp.command) {
      throw new Error("MCP command not found");
    }

    const containers = await docker.listContainers({ all: true }); // Include stopped containers
    let container = containers.find((c) =>
      c.Names.some((name) => name === `/${mcp._id}` || name === mcp._id),
    );

    let sseUrl = mcp.url;
    if (container && container.State === "running") {
      // Container exists and is running, just update URL
      const ci = await docker.getContainer(container.Id).inspect();
      sseUrl = `http://localhost:${ci.HostConfig.PortBindings["8000/tcp"][0].HostPort}/sse`;
    } else if (!sseUrl) {
      // Create a new container
      const newContainer = await docker.createContainer({
        name: mcp._id,
        Image: "mantrakp04/mcprunner:latest",
        Env: [
          `MCP_COMMAND=${mcp.command}`,
          ...(mcp.env
            ? Object.entries(mcp.env).map(([key, value]) => `${key}=${value}`)
            : []),
        ],
        HostConfig: {
          PortBindings: {
            "8000/tcp": [{ HostPort: "8000" }],
          },
        },
      });
      await newContainer.start();
      const ci = await newContainer.inspect();
      sseUrl = `http://${mcp._id}:${ci.HostConfig.PortBindings["8000/tcp"][0].HostPort}/sse`;
    }

    await ctx.runMutation(api.routes.mcps.update, {
      mcpId: args.mcpId,
      updates: sseUrl
        ? {
            url: sseUrl,
            status: "running",
          }
        : {
            status: "error",
          },
    });
  },
});

export const stop = action({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const mcp = await ctx.runQuery(api.routes.mcps.get, {
      mcpId: args.mcpId,
    });
    if (!mcp) {
      throw new Error("MCP not found");
    }

    const containers = await docker.listContainers({ all: true }); // Include stopped containers
    const container = containers.find((c) =>
      c.Names.some((name) => name === `/${mcp._id}` || name === mcp._id),
    );

    if (!container) {
      await ctx.runMutation(api.routes.mcps.update, {
        mcpId: args.mcpId,
        updates: {
          status: "stopped",
          url: "",
        },
      });
      return;
    }

    try {
      const containerInstance = docker.getContainer(container.Id);
      // Force remove the container instead of just stopping it
      await containerInstance.remove({ force: true });

      await ctx.runMutation(api.routes.mcps.update, {
        mcpId: args.mcpId,
        updates: {
          status: "stopped",
          url: "",
        },
      });
    } catch (error: any) {
      throw new Error(
        `Failed to stop container: ${error?.message || "Unknown error"}`,
      );
    }
  },
});

export const stopIdle = action({
  args: {},
  handler: async (ctx, args) => {
    const containers = await docker.listContainers();
    // Remove leading slash from container names and ensure they are valid MCP IDs
    const mcpIds = containers
      .map((c) => c.Names[0]?.replace(/^\//, ""))
      .filter((name): name is Id<"mcps"> => typeof name === "string");

    const mcps = await ctx.runQuery(api.routes.mcps.getMultiple, {
      mcpIds,
    });
    // idle mcps are mcps that are running but last updated more than 15 minutes ago
    const idleMcps = mcps.filter(
      (mcp) =>
        mcp.status === "running" && mcp.updatedAt < Date.now() - 15 * 60 * 1000,
    );

    // Stop mcps
    await Promise.all(
      idleMcps.map((mcp) =>
        ctx.runAction(api.actions.mcps.stop, {
          mcpId: mcp._id,
        }),
      ),
    );
  },
});
