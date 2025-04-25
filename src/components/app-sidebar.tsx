"use client";

import { FolderOpenDot, MessageSquareText, Settings } from "lucide-react";
import Image from "next/image";
import { SignedIn, SignOutButton, useClerk } from "@clerk/nextjs";

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

// Menu items.
const items = [
  {
    title: "Projects",
    url: "#",
    icon: FolderOpenDot,
  },
  {
    title: "Chats",
    url: "#",
    icon: MessageSquareText,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { signOut, user } = useClerk();

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent className="">
        <SidebarGroup className="h-full pt-8">
          <SidebarGroupLabel className="flex items-center gap-2 py-2 text-2xl"></SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild size="default">
                    <a href={item.url}>
                      <item.icon className="text-muted-foreground" />
                      <span className="text-muted-foreground text-lg">
                        {item.title}
                      </span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarFooter className="flex w-full items-center justify-between">
          <SignedIn>
            <div className="dark:hover:bg-accent hover:bg-foreground/10 flex w-full flex-row items-center justify-between gap-2 rounded-sm transition duration-500">
              <div className="flex flex-row items-center gap-2 p-2">
                <Image
                  src={`${user?.imageUrl}`}
                  alt="user"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full bg-white/20"
                />
                <div className="text-sm font-medium">{user?.firstName}</div>
              </div>
              <SignOutButton>
                <div
                  className="rounded-lg pr-2 transition duration-500 hover:cursor-pointer hover:text-red-700 dark:hover:text-red-400"
                  onClick={() => signOut({ redirectUrl: "/sign-up" })}
                >
                  Sign Out
                </div>
              </SignOutButton>
            </div>
          </SignedIn>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
