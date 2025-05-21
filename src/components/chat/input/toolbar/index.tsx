import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  BotIcon,
  ChevronUpIcon,
  GithubIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PaperclipIcon,
  PlusIcon,
  ImageIcon,
  VideoIcon,
  FileTextIcon,
  FileIcon,
  AudioLinesIcon,
  BrainIcon,
  Globe2Icon,
} from "lucide-react";
import { ProjectsDropdown } from "./projects-dropdown";
import { Toggle } from "@/components/ui/toggle";
import { useChat } from "@/store/use-chat";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useNavigate, useParams } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import type { GetModelResult } from "../../../../../convex/actions/models";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const getTagInfo = (tag: string) => {
  switch (tag) {
    case "text":
      return {
        icon: FileTextIcon,
        className: "bg-blue-500/20 backdrop-blur-sm",
      };
    case "image":
      return { icon: ImageIcon, className: "bg-green-500/20 backdrop-blur-sm" };
    case "audio":
      return {
        icon: AudioLinesIcon,
        className: "bg-purple-500/20 backdrop-blur-sm",
      };
    case "video":
      return { icon: VideoIcon, className: "bg-red-500/20 backdrop-blur-sm" };
    case "pdf":
      return { icon: FileIcon, className: "bg-orange-500/20 backdrop-blur-sm" };
    default:
      return { icon: FileIcon, className: "bg-gray-500/20 backdrop-blur-sm" };
  }
};

export const Toolbar = () => {
  const { resizablePanelsOpen, setResizablePanelsOpen } = useChat();
  const params = useParams({ from: "/chat_/$chatId/" });
  const navigate = useNavigate({ from: "/chat/$chatId" });
  const chatId = params?.chatId as Id<"chats"> | "new";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatInput = useQuery(api.routes.chatInput.get, {
    chatId,
  });
  const updateChatInputMutation = useMutation(api.routes.chatInput.update);
  const generateUploadUrlMutation = useMutation(
    api.routes.documents.generateUploadUrl,
  );
  const createDocumentMutation = useMutation(api.routes.documents.create);
  const getModelAction = useAction(api.actions.models.getModel);
  const createChatMutation = useMutation(api.routes.chats.create);
  const createChatInputMutation = useMutation(api.routes.chatInput.create);
  const sendMutation = useMutation(api.routes.chats.send);
  const [getModelResult, setGetModelResult] = useState<GetModelResult | null>(null);

  useEffect(() => {
    const fetchModel = async () => {
      const result = await getModelAction({
        chatId,
      });
      setGetModelResult(result);
    };
    fetchModel();
  }, [chatId, getModelAction]);

  const handleSubmit = async () => {
    let toChatId: Id<"chats">;
    if (params.chatId === "new") {
      const newChatId = await createChatMutation({
        name: "New Chat",
      });
      await createChatInputMutation({
        chatId: newChatId,
        text: chatInput?.text,
        documents: chatInput?.documents,
        model: chatInput?.model,
        agentMode: chatInput?.agentMode,
        smortMode: chatInput?.smortMode,
        webSearch: chatInput?.webSearch,
        projectId: chatInput?.projectId,
      });
      toChatId = newChatId;
      await navigate({ to: "/chat/$chatId", params: { chatId: newChatId } });
    } else {
      toChatId = params.chatId as Id<"chats">;
    }
    const streamId = await sendMutation({
      chatId: toChatId,
    });
    console.log(streamId);
  };

  const handleFileUpload = async (files: FileList) => {
    try {
      const uploadedDocumentIds: Id<"documents">[] = [];

      for (const file of Array.from(files)) {
        // Get upload URL
        const uploadUrlResult = await generateUploadUrlMutation();

        // Upload file
        const result = await fetch(uploadUrlResult, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Upload failed: ${result.statusText}`);
        }

        // Create document
        const { storageId } = await result.json();
        const documentId = await createDocumentMutation({
          name: file.name,
          type: "file",
          size: file.size,
          key: storageId as Id<"_storage">,
        });

        uploadedDocumentIds.push(documentId);
      }

      // Update chat input with new documents
      const existingDocuments = chatInput?.documents || [];
      await updateChatInputMutation({
        chatId,
        updates: {
          documents: [...existingDocuments, ...uploadedDocumentIds],
        },
      });

      toast(
        `${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully`,
      );
    } catch (error) {
      console.error("Upload error:", error);
      toast("Error uploading files", {
        description: "There was an error uploading your files",
      });
    }
  };

  return (
    <div className="flex flex-row justify-between items-center w-full p-1">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
      />
      <div className="flex flex-row items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <PlusIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <PaperclipIcon className="w-4 h-4" />
              Attach Documents
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <GithubIcon className="w-4 h-4" />
              Add GitHub Repo
            </DropdownMenuItem>
            <ProjectsDropdown />
          </DropdownMenuContent>
        </DropdownMenu>

        <Toggle variant="outline" className="bg-input/30" pressed={chatInput?.agentMode} onPressedChange={() => {
          updateChatInputMutation({
            chatId,
            updates: {
              agentMode: !chatInput?.agentMode,
            },
          });
        }}>
          <BotIcon className="h-4 w-4" />
          Agent
        </Toggle>

        <Toggle variant="outline" className="bg-input/30" pressed={chatInput?.smortMode} onPressedChange={() => {
          updateChatInputMutation({
            chatId,
            updates: {
              smortMode: !chatInput?.smortMode,
            },
          });
        }}>
          <BrainIcon className="h-4 w-4" />
          Smort
        </Toggle>

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Toggle variant="outline" className="bg-input/30" pressed={chatInput?.webSearch} onPressedChange={() => {
              updateChatInputMutation({
                chatId,
                updates: {
                  webSearch: !chatInput?.webSearch,
                },
              });
            }}>
              <Globe2Icon className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>
            <p>Search the web</p>
          </TooltipContent>
        </Tooltip>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setResizablePanelsOpen(!resizablePanelsOpen)}
        >
          {resizablePanelsOpen ? (
            <PanelRightCloseIcon className="h-4 w-4" />
          ) : (
            <PanelRightOpenIcon className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex flex-row items-center gap-1">
        <Select
          onValueChange={(value) =>
            updateChatInputMutation({
              chatId,
              updates: {
                model: value,
              },
            })
          }
        >
          <SelectTrigger>{getModelResult?.selectedModel}</SelectTrigger>
          <SelectContent>
            {getModelResult?.config?.model_list.map((model) => (
              <SelectItem
                key={model.model_name}
                value={model.model_name}
                className="min-w-[500px]"
              >
                <div className="flex flex-col w-full gap-2">
                  <span>{model.model_name}</span>
                  {model.tags && (
                    <div className="flex flex-row gap-1">
                      {model.tags?.map((tag) => {
                        const { icon: Icon, className } = getTagInfo(tag);
                        return (
                          <Badge
                            key={tag}
                            className={`flex items-center gap-1 ${className}`}
                          >
                            <Icon className="h-3 w-3" />
                            {tag}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={async () => await handleSubmit()}>
          <ChevronUpIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
