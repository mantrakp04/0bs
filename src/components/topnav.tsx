"use client";

import { Sidebar } from "lucide-react";
import { ModeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { useSidebar } from "./ui/sidebar";
import { usePanelStore } from "@/store/panelStore";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";

export function TopNav() {
  return (
    <nav className={`pointer-events-none fixed top-0 z-50 w-full`}>
      <div className="flex items-center justify-between p-2">
        <TopNavLeft />
        <TopNavRight />
      </div>
    </nav>
  );
}

export function TopNavLeft() {
  const { toggleSidebar, state } = useSidebar();

  return (
    <Button
      variant={state === "collapsed" ? "outline" : "ghost"}
      size="icon"
      onClick={toggleSidebar}
      className="hover:bg-foreground/10 dark:hover:bg-foreground/20 pointer-events-auto top-0 left-0 transition duration-500 hover:cursor-pointer"
    >
      <Sidebar
        className="h-5 w-5"
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
      />
    </Button>
  );
}

export function TopNavRight() {
  const { isPanelVisible } = usePanelStore();

  return (
    <div className="pointer-events-auto top-0 right-0 transition duration-500 hover:cursor-pointer">
      {!isPanelVisible && (
        <div className="flex items-center gap-2">
          <ModeToggle />
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <Button variant="outline">Sign In</Button>
            </SignInButton>
          </SignedOut>
        </div>
      )}
    </div>
  );
}
