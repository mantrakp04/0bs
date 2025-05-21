import { useStream } from "../../../lib/stream_helper";
import { api } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useParams } from "@tanstack/react-router";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { StreamId } from "@convex-dev/persistent-text-streaming";
import { useAuthToken } from "@convex-dev/auth/react";

export const ChatMessages = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const chatInput = useQuery(api.routes.chatInput.get, {
    chatId: params.chatId as Id<"chats">,
  });
  const token = useAuthToken() ?? undefined;
  const { text, status } = useStream(
    api.routes.chats.getChatBody,
    new URL(`${import.meta.env.VITE_CONVEX_API_URL}/chat`),
    true,
    chatInput?.streamId as StreamId,
    token
  );

  return (
    <div className="flex flex-col h-full w-full items-center">
      <h1>Chat Messages</h1>
      {status}
      <div className="flex flex-col h-full w-full items-center">
        {text}
      </div>
    </div>
  );
};
