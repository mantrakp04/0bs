import { useFileUploadStore } from "@/store/uploadStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Document } from '@langchain/core/documents';
import { DialogTrigger } from "@/components/ui/dialog";
import { XIcon, FileIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FilePreviewDialog, getFileIcon } from "@/app/_components/shared/FilePreviewDialog";

function SkeletonBadge() {
  return (
    <Badge variant="outline" className="animate-pulse bg-muted/50">
      <FileIcon className="w-3 h-3 mr-1 opacity-50" />
      <div className="h-3 w-20 bg-muted-foreground/20 rounded" />
    </Badge>
  );
}

export default function DocumentScrollArea() {
  const { uploadedFiles } = useFileUploadStore();
  const isUploading = useFileUploadStore((state) => state.isUploading);

  return (
    <ScrollArea className="max-h-[192px] w-full p-1">
      <div className="flex flex-wrap gap-1.5">
        {uploadedFiles.map((doc, index) => (
          <DocumentBadge key={index} document={doc} />
        ))}
        {isUploading && <SkeletonBadge />}
      </div>
    </ScrollArea>
  );
}

function DocumentBadge({ document }: {
  document: Document;
}) {
  const { removeFile } = useFileUploadStore();

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeFile(document);
  };

  return (
    <FilePreviewDialog
      name={document.metadata.name}
      source={document.metadata.source}
      type={document.metadata.type}
      size={document.metadata.size}
      uploadedAt={document.metadata.uploadedAt}
      content={document.pageContent}
    >
      <DialogTrigger asChild>
        <Badge variant="outline" className="group cursor-pointer">
          {getFileIcon(document.metadata.type)}
          <span className="text-sm font-normal truncate max-w-[120px]">
            {document.metadata.name}
          </span>
          <button
            onClick={handleRemove}
            className="hidden group-hover:block hover:bg-background/50 rounded p-0.5 transition-opacity"
            aria-label="Remove file"
          >
            <XIcon className="w-3 h-3" />
          </button>
        </Badge>
      </DialogTrigger>
    </FilePreviewDialog>
  );
}
