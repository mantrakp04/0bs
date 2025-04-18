import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { Toolbar } from "./Toolbar";
import { useFileUploadStore } from "@/store/uploadStore";
import DocumentScrollArea from "./DocumentScrollArea";

export function ChatInput() {
  const { uploadedFiles } = useFileUploadStore();
  const isUploading = useFileUploadStore((state) => state.isUploading);

  return (
    <div className="flex flex-col bg-muted rounded-md w-[calc(50vw-12rem)]">
      {(uploadedFiles.length > 0 || isUploading) && (
        <DocumentScrollArea />
      )}
      <AutosizeTextarea
        className="bg-muted resize-none p-1.5"
        minHeight={48}
        maxHeight={192}
        placeholder="Type a message..."
      />
      <Toolbar />
    </div>
  );
}
