import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { Toolbar } from "./Toolbar";
import { useFileUploadStore } from "@/store/uploadStore";
import DocumentScrollArea from "./DocumentScrollArea";

export function ChatInput() {
  const { uploadedFiles } = useFileUploadStore();
  const isUploading = useFileUploadStore((state) => state.isUploading);

  return (
    <div className="bg-muted flex w-[calc(50vw-8rem)] flex-col rounded-xl p-2 shadow-sm shadow-white/30">
      {(uploadedFiles.length > 0 || isUploading) && <DocumentScrollArea />}
      <AutosizeTextarea
        className="bg-accent resize-none p-2"
        minHeight={64}
        maxHeight={200}
        placeholder="ask something..."
      />
      <Toolbar />
    </div>
  );
}
