import { Outlet, createRootRoute, Navigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useConvexAuth } from "convex/react";
import { Loader } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DocumentDialog } from "@/components/document-dialog";

export const Route = createRootRoute({
  component: () => {
    const { isLoading, isAuthenticated } = useConvexAuth();

    if (
      !isLoading &&
      !isAuthenticated &&
      !location.pathname.startsWith("/auth")
    ) {
      return <Navigate to="/auth" />;
    }

    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-screen bg-background">
          <Loader className="w-10 h-10 animate-spin" />
        </div>
      );
    }

    return (
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <SidebarProvider className="flex h-svh">
          <AppSidebar />
          <div className="fixed top-2 left-2 z-50">
            <SidebarTrigger />
          </div>
          <Outlet />
          <DocumentDialog />
        </SidebarProvider>
        <Toaster />
        <TanStackRouterDevtools />
      </ThemeProvider>
    );
  },
});
