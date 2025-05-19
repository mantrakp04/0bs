import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useLocation } from "@tanstack/react-router";

export function AppSidebar() {
  const restrictedRoutes = ["/auth"];
  const { pathname } = useLocation();

  if (restrictedRoutes.includes(pathname)) {
    return null;
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-3" />
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
