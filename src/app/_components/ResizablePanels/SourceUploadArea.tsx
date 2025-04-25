"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { UploadIcon } from "lucide-react";
import { api } from "@/trpc/react";
import type { ProjectSource } from "@/lib/types";

interface SourceUploadAreaProps {
  projectId: number;
  onUploadComplete?: () => void;
}

export function SourceUploadArea({ projectId, onUploadComplete }: SourceUploadAreaProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
  
  // Initialize the createSource mutation
  const createSource = api.projects.sources.createSource.useMutation({
    onSuccess: async () => {
      // Invalidate sources query to trigger a refetch
      await utils.projects.sources.getSources.invalidate({ projectId });
      onUploadComplete?.();
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    setError(null);

    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to upload file');
        }

        const { documents } = await response.json() as { documents: ProjectSource[] };
        
        if (!documents?.[0]) {
          throw new Error('No document data received from upload');
        }

        const document = documents[0];
        const metadata = document.metadata ?? {};

        // Create source in the project using the mutation
        await createSource.mutateAsync({
          pageContent: document.pageContent,
          metadata: {
            name: metadata.name,
            key: metadata.source, // The R2 key from the upload response
            type: metadata.type,
            size: metadata.size,
            projectId,
          },
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  }, [projectId, createSource, onUploadComplete]);

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
      {(error || createSource.error) && (
        <div className="text-destructive text-sm mt-2">
          Error uploading file: {error || createSource.error?.message}
        </div>
      )}
    </div>
  );
} 