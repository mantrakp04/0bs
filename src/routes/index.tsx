import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Switch } from "@/components/ui/switch";
import { useCreateTaskStore } from "@/store/use-create-task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2Icon, LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuthActions } from "@convex-dev/auth/react";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const tasks = useQuery(api.routes.tasks.get);
  const createTask = useMutation(api.routes.tasks.create);
  const updateTask = useMutation(api.routes.tasks.update);
  const removeTask = useMutation(api.routes.tasks.remove);
  const { text, setText } = useCreateTaskStore();
  const { signOut } = useAuthActions();

  return (
    <div className="min-h-screen bg-background p-8 flex flex-col items-center gap-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center">Task Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1"
            />
            <Button
              onClick={() => {
                if (!text.trim()) return;
                createTask({ text });
                setText("");
                toast.success("Task created");
              }}
            >
              Create
            </Button>
          </div>
          <div className="space-y-2">
            {tasks?.map(({ _id, text, isCompleted }) => (
              <div
                key={_id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border",
                  isCompleted ? "bg-muted/50" : "bg-card",
                )}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isCompleted}
                    onCheckedChange={() => {
                      updateTask({ id: _id, isCompleted: !isCompleted });
                    }}
                  />
                  <span
                    className={cn(
                      "text-sm",
                      isCompleted && "line-through text-muted-foreground",
                    )}
                  >
                    {text}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    removeTask({ id: _id });
                    toast.success("Task removed");
                  }}
                >
                  <Trash2Icon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Button onClick={() => signOut()}>
        <LogOutIcon className="w-4 h-4" />
      </Button>
    </div>
  );
}
