"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon, PaperclipIcon, FolderIcon, GithubIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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

type Project = InferSelectModel<typeof projects>;

export function AddButton() {
  const uploadFile = useFileUploadStore((state) => state.uploadFile);
  const isUploading = useFileUploadStore((state) => state.isUploading);
  const error = useFileUploadStore((state) => state.error);
  const setSelectedProject = useProjectStore((state) => state.setSelectedProject);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch 3 most recent projects with stale-while-revalidate
  const { data: projectData } = api.project.getAll.useQuery(
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
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (file) {
          await uploadFile(file);
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    // The panel visibility is handled in the project store
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        className="hidden"
        accept="*/*"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="outline">
            <PlusIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 mt-0.5">
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <PaperclipIcon className="mr-2 h-4 w-4" />
            Upload a file
          </DropdownMenuItem>
          <DropdownMenuItem>
            <GithubIcon className="mr-2 h-4 w-4" />
            Add from GitHub
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderIcon className="mr-2 h-4 w-4" />
              Use a project
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="ml-2">
              {recentProjects?.map((project) => (
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
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <div className="text-destructive text-sm mt-2">
          Error uploading file: {error}
        </div>
      )}
    </>
  );
}