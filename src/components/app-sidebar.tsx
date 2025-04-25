"use client";

import { Calendar, Home, Inbox, Search, Settings } from "lucide-react";
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
import { Button } from "react-day-picker";

// Menu items.
const items = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
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
      <SidebarContent>
        {/* <SidebarHeader className="flex flex-row items-center gap-1">
          <SidebarTrigger />
        </SidebarHeader> */}
        <SidebarGroup className="h-full pt-8">
          <SidebarGroupLabel className="flex items-center gap-2 py-2 text-2xl"></SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarFooter className="flex w-full items-center justify-between">
          <SignedIn>
            <div className="hover:bg-accent flex w-full flex-row items-center justify-between gap-2 rounded-sm transition duration-500">
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
                  className="rounded-sm pr-2 transition duration-500 hover:cursor-pointer hover:text-red-400"
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
