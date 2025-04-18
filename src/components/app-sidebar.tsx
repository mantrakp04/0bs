'use client'

import { Calendar, Home, Inbox, Search, Settings, MenuIcon, PlusIcon, SearchIcon, LogOut, LogIn } from "lucide-react"
import { signIn, signOut, useSession } from "next-auth/react"

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
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image";

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
]

export function AppSidebar() {
  const sidebar = useSidebar();
  const { data: session } = useSession();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarHeader className="flex flex-row items-center gap-1">
          <SidebarTrigger />
          <div className={`flex flex-row items-center gap-1 ${sidebar.open ? "block" : "hidden"}`}>
            <Image src="/logo.svg" alt="Logo" width={24} height={24} />
            <span className="text-lg font-bold">bs</span>
          </div>
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
        <SidebarFooter className="flex flex-row items-center justify-between">
          {session?.user ? (
            <SidebarMenuItem className="flex flex-row items-center justify-between w-full">
              <div className="flex flex-row items-center gap-2">
                <Avatar>
                  <AvatarImage src={session?.user?.image || ""} />
                  <AvatarFallback>
                    {session?.user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{session?.user?.name}</span>
              </div>
              <button onClick={() => signOut()} className="hover:bg-muted/50 rounded-md p-1">
                <LogOut className="size-4" />
              </button>
            </SidebarMenuItem>
          ) : (
            <SidebarMenuButton onClick={() => signIn()}>
              <LogIn />
              <span>Sign in</span>
            </SidebarMenuButton>
          )}
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  )
}
