"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { UploadIcon } from "lucide-react";
import { api } from "@/trpc/react";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";
import { toast } from "sonner";

interface SourceUploadAreaProps {
  projectId: string;
  onUploadComplete?: () => void;
}

export function SourceUploadArea({ projectId, onUploadComplete }: SourceUploadAreaProps) {
  const [isUploading, setIsUploading] = useState(false);
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const { files } = await response.json();
      
      if (!files?.length) {
        throw new Error('No files were uploaded');
      }

      // Create source in the project using the mutation
      await createSource.mutateAsync({
        projectId,
        keys: files.map((file: { source: { key: string } }) => file.source.key),
        skipTypes: [], // Add skip types if needed
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  }, [projectId, createSource]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading || createSource.isPending,
  });

  return (
    <div className="w-full p-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors duration-200 ease-in-out cursor-pointer",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50",
          (isUploading || createSource.isPending) && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <UploadIcon className="h-8 w-8 text-muted-foreground/50" />
          <div className="text-sm text-muted-foreground">
            {isDragActive ? (
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