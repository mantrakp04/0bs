import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState } from "react";
import { FoldersIcon, PlusIcon } from "lucide-react";
import { useChat } from "@/store/use-chat";
export const ProjectsDropdown = () => {
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const projects = useQuery(api.routes.projects.getAll, {
    paginationOpts: { numItems: 3, cursor: null },
  });
  const createProject = useMutation(api.routes.projects.create);
  const { setSelectedProjectId, setResizablePanelsOpen, setResizablePanelTab } =
    useChat();

  const handleCreateProject = async () => {
    if (!name.trim()) return;
    await createProject({ name, description: description.trim() || undefined });
    setNewProjectOpen(false);
    setName("");
    setDescription("");
  };

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="flex items-center gap-2">
          <FoldersIcon className="w-4 h-4" />
          Projects
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="ml-2">
          {projects?.page.slice(0, 3).map((project) => (
            <DropdownMenuItem
              key={project._id}
              onSelect={() => {
                setSelectedProjectId(project._id);
                setResizablePanelTab("projects");
                setResizablePanelsOpen(true);
              }}
            >
              {project.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setNewProjectOpen(true);
            }}
          >
            <PlusIcon className="w-4 h-4" />
            Add New Project
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name">Name</label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description">Description (Optional)</label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProjectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
