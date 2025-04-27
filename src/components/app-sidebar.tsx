"use client";

import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { FolderOpenDot, MessageSquareText, Plus, Star } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/trpc/react";

import {
  Sidebar,
  SidebarContent,
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
  requiresAuth: boolean;
  icon: React.ElementType;
  variant: "outline" | "default";
}[] = [
  {
    title: "New Chat",
    url: "/chat/new",
    icon: Plus,
    requiresAuth: true,
    variant: "outline",
  },
  {
    title: "Projects",
    url: "/projects",
    requiresAuth: true,
    icon: FolderOpenDot,
    variant: "default",
  },
  {
    title: "Chats",
    url: "/chats",
    requiresAuth: true,
    icon: MessageSquareText,
    variant: "default",
  },
];

export function AppSidebar() {
  const { user, isLoaded } = useUser();
  const { ref, inView } = useInView();

  // Move all hooks before the conditional check
  const { data: starredChats } = api.chat.getAll.useQuery(
    {
      starred: true,
      limit: 5,
    },
    {
      enabled: isLoaded && !!user, // Only fetch if user exists and auth is loaded
      initialData: {
        items: [],
        nextCursor: undefined,
      },
    },
  );

  // Query for infinite non-starred chats
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.chat.getAll.useInfiniteQuery(
    {
      limit: 5,
    },
    {
      enabled: isLoaded && !!user, // Only fetch if user exists and auth is loaded
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  // Fetch next page when the last item comes into view
  useEffect(() => {
    if (isLoaded && user && inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage, user, isLoaded]); // Added isLoaded to dependencies

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
                    <a
                      href={item.requiresAuth && !user ? undefined : item.url}
                      className={`${
                        item.requiresAuth && !user
                          ? "cursor-not-allowed opacity-50"
                          : ""
                      } `}
                    >
                      <item.icon className="text-muted-foreground" />
                      <span className="text-muted-foreground text-md">
                        {item.title}
                      </span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Starred Chats */}
              {user && starredChats && (
                <>
                  {starredChats.items.length > 0 && (
                    <div className="px-2 pt-4">
                      <p className="text-muted-foreground font-medium">
                        Starred Chats
                      </p>
                    </div>
                  )}

                  {starredChats.items.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton
                        asChild
                        size="default"
                        variant="default"
                      >
                        <a href={`/chat/${chat.id}`}>
                          <MessageSquareText className="text-muted-foreground" />
                          <span className="text-muted-foreground text-md flex-1">
                            {chat.name ?? "Untitled Chat"}
                          </span>
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              )}

              {/* Recent Chats */}
              {user && (
                <div className="px-2 pt-4">
                  <p className="text-muted-foreground font-medium">
                    Recent Chats
                  </p>
                </div>
              )}

              {user &&
                nonStarredChats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton asChild size="default" variant="default">
                      <a href={`/chat/${chat.id}`}>
                        <MessageSquareText className="text-muted-foreground" />
                        <span className="text-muted-foreground text-md flex-1">
                          {chat.name ?? "New Chat"}
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
      </SidebarContent>
    </Sidebar>
  );
}
