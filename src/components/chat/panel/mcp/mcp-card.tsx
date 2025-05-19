import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Trash2 } from "lucide-react";
import type { MCPCardProps } from "./types";

export const MCPCard = ({ mcp, onStartStop, onDelete }: MCPCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-0">
        <div className="space-y-0.5">
          <CardTitle className="text-xl font-medium">{mcp.name}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {mcp.command}
          </CardDescription>
        </div>
        <div className="flex items-center">
          <Badge variant={mcp.status === "running" ? "default" : "secondary"}>
            <span>{mcp.status || "stopped"}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onStartStop(mcp._id, mcp.status === "running")}
            >
              {mcp.status === "running" ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => onDelete(mcp._id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
