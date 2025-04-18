'use client';

import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ResizablePanels } from "@/app/_components/ResizablePanels";

export default function ChatPage() {
  const { id } = useParams();
  const { data: session } = useSession();

  return (
    <main className="h-screen w-full p-1">
      <ResizablePanels>
        <div className="w-full h-full">{id}</div>
      </ResizablePanels>
    </main>
  );
}