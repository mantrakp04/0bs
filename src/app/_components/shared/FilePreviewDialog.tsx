import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DotIcon, DownloadIcon, ImageIcon, VideoIcon, Music2Icon, FileTextIcon, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface FilePreviewDialogProps {
  name: string;
  source: string;
  type: string;
  size: number;
  uploadedAt: Date;
  content?: string;
  children: React.ReactNode;
}

export function FilePreviewDialog({ name, source, type, size, uploadedAt, content, children }: FilePreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSignedUrl = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/download?key=${encodeURIComponent(source)}`);
      const data = await response.json();
      setPreviewUrl(data.url);
    } catch (error) {
      console.error('Failed to get signed URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (source) {
      fetchSignedUrl();
    }
  }, [source]);

  const handleDownload = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const renderPreview = () => {
    if (isLoading) {
      return <div className="text-center py-8">Loading preview...</div>;
    }

    if (!previewUrl) {
      return <div className="text-center py-8">Failed to load preview</div>;
    }

    const fileType = type.split('/')[0];

    switch (fileType) {
      case 'image':
        return (
          <img 
            src={previewUrl}
            alt={name}
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
        if (type === 'application/pdf') {
          return (
            <iframe
              src={previewUrl}
              className="w-full h-[400px]"
              title={name}
            />
          );
        }
        return <div className="text-center py-8">Preview not available for this file type</div>;
      case 'text':
        return (
          <pre className="max-h-[400px] overflow-auto p-4 bg-muted rounded-lg">
            {content}
          </pre>
        );
      default:
        return <div className="text-center py-8">Preview not available for this file type</div>;
    }
  };

  return (
    <Dialog>
      {children}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription className="flex flex-row items-center gap-0">
            {(size / 1024 / 1024).toFixed(2)} MB <DotIcon className="w-4 h-4" />
            {new Date(uploadedAt).toLocaleString().split(',')[0]}
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

export function getFileIcon(type: string) {
  const fileType = type.split('/')[0];
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
} 