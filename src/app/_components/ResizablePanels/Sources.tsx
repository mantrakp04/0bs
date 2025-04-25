"use client";

import { useProjectStore } from "@/store/projectStore";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderIcon, FileIcon, XIcon, Trash2Icon } from "lucide-react";
import { SourceUploadArea } from "./SourceUploadArea";
import { format } from "date-fns";
import { FilePreviewDialog, getFileIcon } from "@/app/_components/shared/FilePreviewDialog";
import { DialogTrigger } from "@/components/ui/dialog";

export function Sources() {
  const selectedProject = useProjectStore((state) => state.selectedProject);
  const setSelectedProject = useProjectStore((state) => state.setSelectedProject);
  const { data: sources, refetch: refetchSources } = api.projects.sources.getSources.useQuery(
    { projectId: selectedProject?.id ?? 0 },
    { enabled: !!selectedProject }
  );

  const deleteSource = api.projects.sources.deleteSource.useMutation({
    onSuccess: () => {
      void refetchSources();
    },
  });

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <FolderIcon className="h-12 w-12 text-muted-foreground/50" />
        <span className="text-sm text-muted-foreground mt-4">
          Select a project to get started
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <FolderIcon className="h-5 w-5" />
          <h2 className="text-lg font-semibold">{selectedProject.name}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setSelectedProject(null)}
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Close project</span>
        </Button>
      </div>
      
      {selectedProject.description && (
        <p className="text-sm text-muted-foreground px-4 mb-4">
          {selectedProject.description}
        </p>
      )}

      <SourceUploadArea 
        projectId={selectedProject.id} 
        onUploadComplete={refetchSources}
      />

      <ScrollArea className="h-[calc(100vh-20rem)]">
        {sources && sources.length > 0 ? (
          <div className="space-y-2 p-4">
            {sources.map((source) => (
              <FilePreviewDialog
                key={source.id}
                name={source.name}
                source={source.key}
                type={source.type}
                size={source.size}
                uploadedAt={source.createdAt}
              >
                <DialogTrigger asChild>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent group cursor-pointer">
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(source.type)}
                      <span className="text-sm truncate">{source.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(source.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSource.mutate({ id: source.id });
                      }}
                    >
                      <Trash2Icon className="h-4 w-4" />
                      <span className="sr-only">Delete source</span>
                    </Button>
                  </div>
                </DialogTrigger>
              </FilePreviewDialog>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileIcon className="h-8 w-8 text-muted-foreground/50" />
            <span className="text-sm text-muted-foreground mt-2">
              No files in this project yet
            </span>
            <span className="text-xs text-muted-foreground">
              Drag and drop files or use the upload area above
            </span>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}