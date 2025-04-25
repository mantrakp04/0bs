"use client";

import { useParams } from "next/navigation";
import { ResizablePanels } from "@/app/_components/ResizablePanels";

export default function ChatPage() {
  const { id } = useParams();

  return (
    <main className="h-screen w-full p-1">
      <ResizablePanels>
        <div className="h-full w-full">{id}</div>
      </ResizablePanels>
    </main>
  );
}
