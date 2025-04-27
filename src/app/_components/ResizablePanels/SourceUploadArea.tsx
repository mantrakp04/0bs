"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { UploadIcon } from "lucide-react";
import { api } from "@/trpc/react";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

interface SourceUploadAreaProps {
  projectId: string;
  onUploadComplete?: () => void;
}

export function SourceUploadArea({
  projectId,
  onUploadComplete,
}: SourceUploadAreaProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { user, isLoaded } = useUser();
  const utils = api.useUtils();

  // Initialize the createSource mutation
  const createSource = api.project.source.create.useMutation({
    onSuccess: async () => {
      // Invalidate sources query to trigger a refetch
      await utils.project.source.getAll.invalidate({ projectId });
      onUploadComplete?.();
      toast.success("Files uploaded successfully");
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error(`Error creating source: ${error.message}`);
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!user) {
        toast.error("You must be logged in to upload files");
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        acceptedFiles.forEach((file) => {
          formData.append("files", file);
        });

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to upload file");
        }

        const { files } = await response.json();

        if (!files?.length) {
          throw new Error("No files were uploaded");
        }

        // Create source in the project using the mutation
        await createSource.mutateAsync({
          projectId,
          keys: files.map(
            (file: { source: { key: string } }) => file.source.key,
          ),
          skipTypes: [], // Add skip types if needed
        });
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to upload file",
        );
      } finally {
        setIsUploading(false);
      }
    },
    [projectId, createSource, user],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading || createSource.isPending || !user,
  });

  return (
    <div className="w-full p-4">
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-6 transition-colors duration-200 ease-in-out",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20 hover:border-primary/50",
          (isUploading || createSource.isPending || !user) &&
            "cursor-not-allowed opacity-50",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <UploadIcon className="text-muted-foreground/50 h-8 w-8" />
          <div className="text-muted-foreground text-sm">
            {!isLoaded ? (
              <p>Loading...</p>
            ) : !user ? (
              <p>Please log in to upload files</p>
            ) : isDragActive ? (
              <p>Drop the files here ...</p>
            ) : (
              <p>Drag & drop files here, or click to select files</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
