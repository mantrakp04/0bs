import { useFileUploadStore } from "@/store/uploadStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Document } from "@langchain/core/documents";
import { DialogTrigger } from "@/components/ui/dialog";
import { XIcon, FileIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  FilePreviewDialog,
  getFileIcon,
} from "@/app/_components/shared/FilePreviewDialog";

function SkeletonBadge() {
  return (
    <Badge variant="outline" className="bg-muted/50 animate-pulse">
      <FileIcon className="mr-1 h-3 w-3 opacity-50" />
      <div className="bg-muted-foreground/20 h-3 w-20 rounded" />
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

function DocumentBadge({ document }: { document: Document }) {
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
          <span className="max-w-[120px] truncate text-sm font-normal">
            {document.metadata.name}
          </span>
          <button
            onClick={handleRemove}
            className="hover:bg-background/50 hidden rounded p-0.5 transition-opacity group-hover:block"
            aria-label="Remove file"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </Badge>
      </DialogTrigger>
    </FilePreviewDialog>
  );
}
