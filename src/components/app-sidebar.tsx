"use client";

import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import {
  FolderOpenDot,
  LogOutIcon,
  MessageSquareText,
  Plus,
  Star,
} from "lucide-react";
import Image from "next/image";
import { SignedIn, SignOutButton, useClerk } from "@clerk/nextjs";
import { api } from "@/trpc/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Static menu items
const staticItems: {
  title: string;
  url: string;
  icon: React.ElementType;
  variant: "outline" | "default";
}[] = [
  {
    title: "New Chat",
    url: "/chat/new",
    icon: Plus,
    variant: "outline",
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderOpenDot,
    variant: "default",
  },
  {
    title: "Chats",
    url: "/chats",
    icon: MessageSquareText,
    variant: "default",
  },
];

export function AppSidebar() {
  const { signOut, user } = useClerk();
  const { ref, inView } = useInView();

  // Query for starred chats
  const { data: starredChats } = api.chat.getStarred.useQuery(undefined, {
    initialData: [],
  });

  // Query for infinite non-starred chats
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.chat.infiniteChats.useInfiniteQuery(
    {
      limit: 10,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  // Fetch next page when the last item comes into view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

  const nonStarredChats =
    infiniteData?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup className="h-full pt-8">
          <SidebarGroupLabel className="flex items-center gap-2 py-2 text-2xl"></SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {/* Static menu items */}
              {staticItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    size="default"
                    variant={item.variant}
                  >
                    <a href={item.url}>
                      <item.icon className="text-muted-foreground" />
                      <span className="text-muted-foreground text-md">
                        {item.title}
                      </span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Starred Chats */}
              {starredChats.length > 0 && (
                <>
                  <div className="p-0">
                    <p className="text-muted-foreground text-xs font-medium">
                      Starred Chats
                    </p>
                  </div>
                  {starredChats.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton
                        asChild
                        size="default"
                        variant="default"
                      >
                        <a href={`/chat/${chat.id}`}>
                          <MessageSquareText className="text-muted-foreground" />
                          <span className="text-muted-foreground text-md flex-1">
                            {chat.name || "Untitled Chat"}
                          </span>
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              )}

              {/* Recent Chats */}
              <div className="px-3 pt-4 pb-2">
                <p className="text-muted-foreground text-xs font-medium">
                  Recent Chats
                </p>
              </div>
              {nonStarredChats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton asChild size="default" variant="default">
                    <a href={`/chat/${chat.id}`}>
                      <MessageSquareText className="text-muted-foreground" />
                      <span className="text-muted-foreground text-md flex-1">
                        {chat.name || "Untitled Chat"}
                      </span>
                      <Star className="text-muted-foreground/40 h-4 w-4" />
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Infinite scroll trigger */}
              <div ref={ref} className="py-2">
                {isFetchingNextPage && (
                  <div className="text-muted-foreground text-center text-xs">
                    Loading more...
                  </div>
                )}
              </div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* <SidebarFooter className="flex w-full items-center justify-between"></SidebarFooter> */}
      </SidebarContent>
    </Sidebar>
  );
}
