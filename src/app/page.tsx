import { auth } from "@/server/auth";
import { api, HydrateClient } from "@/trpc/server";
import { ResizablePanels } from "./_components/ResizablePanels";
import { GreetingMessage } from "./_components/GreetingMessage";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      <main className="flex flex-row w-full p-1">
        <ResizablePanels>
          <GreetingMessage />
        </ResizablePanels>
      </main>
    </HydrateClient>
  );
}
