"use client";

import { Calendar, Home, Inbox, Search, Settings } from "lucide-react";
import { SignedIn, UserButton, SignOutButton, useClerk } from "@clerk/nextjs";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";

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
  const { signOut } = useClerk();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarHeader className="flex flex-row items-center gap-1">
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarGroup className="h-full">
          <SidebarGroupLabel>Application</SidebarGroupLabel>
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
            <div className="hover:bg-accent flex w-full flex-row items-center justify-between gap-2 rounded-sm p-2 transition duration-500">
              <UserButton />
              <SignOutButton>
                <div
                  className="rounded-sm hover:cursor-pointer"
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
