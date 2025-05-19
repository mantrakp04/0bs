import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { NewMCPData } from "./types";
import { CreateDialog } from "./create-dialog";
import { MCPCard } from "./mcp-card";

export const MCPPanel = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const mcps = useQuery(api.routes.mcps.getAll, {
    paginationOpts: { numItems: 100, cursor: null },
  });

  const createMCP = useMutation(api.routes.mcps.create);
  const removeMCP = useMutation(api.routes.mcps.remove);
  const startMCP = useAction(api.actions.mcps.start);
  const stopMCP = useAction(api.actions.mcps.stop);

  const handleCreate = async (newMCPData: NewMCPData) => {
    try {
      const env =
        newMCPData.type === "stdio"
          ? Object.fromEntries(
              newMCPData.envVars
                .filter((env) => env.key && env.value)
                .map((env) => [env.key, env.value]),
            )
          : {};

      const mcpId = await createMCP({
        name: newMCPData.name,
        command:
          newMCPData.type === "stdio" ? newMCPData.command : newMCPData.url,
        env,
        status: "stopped",
      });

      await startMCP({ mcpId });
      setIsCreateOpen(false);
    } catch (error) {
      console.error("Failed to create MCP:", error);
    }
  };

  const handleDelete = async (mcpId: Id<"mcps">) => {
    try {
      await stopMCP({ mcpId });
      await removeMCP({ mcpId });
    } catch (error) {
      console.error("Failed to delete MCP:", error);
    }
  };

  const handleStartStop = async (mcpId: Id<"mcps">, isRunning: boolean) => {
    try {
      if (isRunning) {
        await stopMCP({ mcpId });
      } else {
        await startMCP({ mcpId });
      }
    } catch (error) {
      console.error("Failed to start/stop MCP:", error);
    }
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">MCPs</h2>
        <CreateDialog
          isOpen={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onCreate={handleCreate}
        />
      </div>

      <div className="grid gap-4">
        {mcps?.page.map((mcp) => (
          <MCPCard
            key={mcp._id}
            mcp={{
              _id: mcp._id,
              name: mcp.name,
              command: mcp.command || mcp.url || "",
              status: mcp.status || "stopped",
            }}
            onStartStop={handleStartStop}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
};
