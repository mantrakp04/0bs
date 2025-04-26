"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon, PaperclipIcon, FolderIcon, GithubIcon, Loader2Icon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFileUploadStore } from "@/store/uploadStore";
import { useProjectStore } from "@/store/projectStore";
import { useRef } from "react";
import { api } from "@/trpc/react";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { type InferSelectModel } from "drizzle-orm";
import { type projects } from "@/server/db/schema";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Project = InferSelectModel<typeof projects>;

export function AddButton() {
  const uploadFile = useFileUploadStore((state) => state.uploadFile);
  const isUploading = useFileUploadStore((state) => state.isUploading);
  const error = useFileUploadStore((state) => state.error);
  const setSelectedProject = useProjectStore((state) => state.setSelectedProject);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch 3 most recent projects with stale-while-revalidate
  const { data: projectData, isLoading: isLoadingProjects } = api.project.getAll.useQuery(
    { limit: 3 },
    {
      staleTime: 30 * 1000, // Consider data stale after 30 seconds
      refetchInterval: 30 * 1000, // Refetch every 30 seconds in the background
    }
  );

  const recentProjects = projectData?.items;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files.item(i);
          if (file) {
            await uploadFile(file);
          }
        }
        toast.success("Files uploaded successfully");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to upload files");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    toast.success(`Switched to project: ${project.name}`);
  };

  return (
    <TooltipProvider>
      <div className="relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          className="hidden"
          accept="*/*"
          aria-label="Upload files"
        />
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="icon" 
                  variant="outline"
                  aria-label="Add content"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlusIcon className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add content</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-48 mt-0.5">
            <DropdownMenuItem 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PaperclipIcon className="mr-2 h-4 w-4" />
              )}
              {isUploading ? "Uploading..." : "Upload a file"}
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <GithubIcon className="mr-2 h-4 w-4" />
              Add from GitHub
              <span className="ml-auto text-xs text-muted-foreground">Soon</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderIcon className="mr-2 h-4 w-4" />
                Use a project
                {isLoadingProjects && (
                  <Loader2Icon className="ml-auto h-4 w-4 animate-spin" />
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="ml-2">
                {isLoadingProjects ? (
                  <DropdownMenuItem disabled>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Loading projects...
                  </DropdownMenuItem>
                ) : recentProjects?.length ? (
                  <>
                    {recentProjects.map((project) => (
                      <DropdownMenuItem 
                        key={project.id}
                        onSelect={() => handleProjectSelect(project)}
                      >
                        <FolderIcon className="mr-2 h-4 w-4" />
                        {project.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <CreateProjectDialog />
                  </>
                ) : (
                  <>
                    <DropdownMenuItem disabled>
                      No recent projects
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <CreateProjectDialog />
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        {error && toast.error(error)}
      </div>
    </TooltipProvider>
  );
}