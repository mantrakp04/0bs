import { useFileUploadStore } from "@/store/uploadStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Document } from '@langchain/core/documents';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { DotIcon, DownloadIcon, XIcon, ImageIcon, VideoIcon, Music2Icon, FileTextIcon, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSignedUrl = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/download?key=${encodeURIComponent(document.metadata.source)}`);
      const data = await response.json();
      setPreviewUrl(data.url);
    } catch (error) {
      console.error('Failed to get signed URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (document.metadata.source) {
      fetchSignedUrl();
    }
  }, [document.metadata.source]);

  const handleDownload = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeFile(document);
  };

  const renderPreview = () => {
    if (isLoading) {
      return <div className="text-center py-8">Loading preview...</div>;
    }

    if (!previewUrl) {
      return <div className="text-center py-8">Failed to load preview</div>;
    }

    const fileType = document.metadata.type?.split('/')[0];

    switch (fileType) {
      case 'image':
        return (
          <img 
            src={previewUrl}
            alt={document.metadata.name}
            className="max-w-full h-auto max-h-[400px] object-contain"
          />
        );
      case 'video':
        return (
          <video 
            controls 
            className="max-w-full h-auto max-h-[400px]"
            src={previewUrl}
          />
        );
      case 'audio':
        return (
          <audio 
            controls 
            className="w-full"
            src={previewUrl}
          />
        );
      case 'application':
        if (document.metadata.type === 'application/pdf') {
          return (
            <iframe
              src={previewUrl}
              className="w-full h-[400px]"
              title={document.metadata.name}
            />
          );
        }
        return <div className="text-center py-8">Preview not available for this file type</div>;
      case 'text':
        return (
          <pre className="max-h-[400px] overflow-auto p-4 bg-muted rounded-lg">
            {document.pageContent}
          </pre>
        );
      default:
        return <div className="text-center py-8">Preview not available for this file type</div>;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Badge variant="outline" className="group">
          {(() => {
            const fileType = document.metadata.type?.split('/')[0];
            switch (fileType) {
              case 'image':
                return <ImageIcon className="w-3 h-3 mr-1" />;
              case 'video':
                return <VideoIcon className="w-3 h-3 mr-1" />;
              case 'audio':
                return <Music2Icon className="w-3 h-3 mr-1" />;
              case 'text':
                return <FileTextIcon className="w-3 h-3 mr-1" />;
              default:
                return <FileIcon className="w-3 h-3 mr-1" />;
            }
          })()}
          <span className="text-sm font-normal truncate max-w-[120px]">{document.metadata.name}</span>
          <button
            onClick={handleRemove}
            className="hidden group-hover:block hover:bg-background/50 rounded p-0.5 transition-opacity"
            aria-label="Remove file"
          >
            <XIcon className="w-3 h-3" />
          </button>
        </Badge>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{document.metadata.name}</DialogTitle>
          <DialogDescription className="flex flex-row items-center gap-0">
            {(document.metadata.size / 1024 / 1024).toFixed(2)} MB <DotIcon className="w-4 h-4" />
            {new Date(document.metadata.uploadedAt).toLocaleString().split(',')[0]}
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">
          {renderPreview()}
        </div>
        <DialogFooter>
          <Button onClick={handleDownload} variant="outline" disabled={!previewUrl}>
            <DownloadIcon className="w-4 h-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
