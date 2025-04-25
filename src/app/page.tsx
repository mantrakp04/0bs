import { auth } from "@clerk/nextjs/server";
import { api, HydrateClient } from "@/trpc/server";
import { ResizablePanels } from "./_components/ResizablePanels";
import { GreetingMessage } from "./_components/GreetingMessage";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      <main className="flex w-full flex-row p-1">
        <ResizablePanels>
          <GreetingMessage />
        </ResizablePanels>
      </main>
    </HydrateClient>
  );
}
