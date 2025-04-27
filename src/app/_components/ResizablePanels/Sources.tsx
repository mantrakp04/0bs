"use client";

import { useProjectStore } from "@/store/projectStore";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderIcon, FileIcon, XIcon, Trash2Icon } from "lucide-react";
import { SourceUploadArea } from "./SourceUploadArea";
import { format } from "date-fns";
import {
  FilePreviewDialog,
  getFileIcon,
} from "@/app/_components/shared/FilePreviewDialog";
import { DialogTrigger } from "@/components/ui/dialog";
import { type sources, type projectSources } from "@/server/db/schema";
import { useUser } from "@clerk/nextjs";
type ProjectSource = typeof projectSources.$inferSelect & {
  source: typeof sources.$inferSelect;
};

export function Sources() {
  const { user, isLoaded } = useUser();
  const selectedProject = useProjectStore((state) => state.selectedProject);
  const setSelectedProject = useProjectStore(
    (state) => state.setSelectedProject,
  );
  const { data: sourcesData, refetch: refetchSources } =
    api.project.source.getAll.useQuery(
      { projectId: selectedProject?.id ?? "" },
      { enabled: isLoaded && !!user && !!selectedProject },
    );

  const deleteSource = api.project.source.delete.useMutation({
    onSuccess: () => {
      void refetchSources();
    },
  });

  if (!selectedProject) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <FolderIcon className="text-muted-foreground/50 h-12 w-12" />
        <span className="text-muted-foreground mt-4 text-sm">
          Select a project to get started
        </span>
      </div>
    );
  }

  const sources = sourcesData?.items ?? [];

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <FolderIcon className="h-5 w-5" />
          <h2 className="text-lg font-semibold">{selectedProject.name}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-8 w-8"
          onClick={() => setSelectedProject(null)}
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Close project</span>
        </Button>
      </div>

      {selectedProject.description && (
        <p className="text-muted-foreground mb-4 px-4 text-sm">
          {selectedProject.description}
        </p>
      )}

      <SourceUploadArea
        projectId={selectedProject.id}
        onUploadComplete={refetchSources}
      />

      <ScrollArea className="h-[calc(100vh-20rem)]">
        {sources.length > 0 ? (
          <div className="space-y-2 p-4">
            {sources.map((projectSource: ProjectSource) => (
              <FilePreviewDialog
                key={projectSource.id}
                name={projectSource.source.name ?? ""}
                source={projectSource.source.key ?? ""}
                type={projectSource.source.type ?? ""}
                size={projectSource.source.size ?? 0}
                uploadedAt={projectSource.source.createdAt ?? new Date()}
              >
                <DialogTrigger asChild>
                  <div className="hover:bg-accent group flex cursor-pointer items-center justify-between rounded-lg p-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {getFileIcon(projectSource.source.type ?? "")}
                      <span className="truncate text-sm">
                        {projectSource.source.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {format(
                          projectSource.source.createdAt ?? new Date(),
                          "MMM d, yyyy",
                        )}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSource.mutate({ id: projectSource.id });
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
          <div className="flex h-full flex-col items-center justify-center text-center">
            <FileIcon className="text-muted-foreground/50 h-8 w-8" />
            <span className="text-muted-foreground mt-2 text-sm">
              No files in this project yet
            </span>
            <span className="text-muted-foreground text-xs">
              Drag and drop files or use the upload area above
            </span>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
