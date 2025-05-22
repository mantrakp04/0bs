import { api } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useParams } from "@tanstack/react-router";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";

export const ChatMessages = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const chatStream = useQuery(api.routes.chatStream.get, {
    chatId: params.chatId as Id<"chats">,
  });

  return (
    <ScrollArea className="flex-1 overflow-hidden">
      <div className="flex flex-col max-w-4xl mx-auto">
        {chatStream?.stream && (
          <div className="flex flex-col space-y-2">
            <div className="text-md break-words whitespace-pre-wrap w-full overflow-hidden">
              {chatStream.stream}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
