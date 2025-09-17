import { BarChart3, Calendar, FileText, Link2, Settings, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { name: "Content", icon: FileText, href: "/content" },
  { name: "Data", icon: BarChart3, href: "/data" },
  { name: "Scheduling", icon: Calendar, href: "/scheduling" },
  { name: "Settings", icon: Settings, href: "/settings" },
  // TODO: analytics page
  // { name: "Analytics", icon: TrendingUp, href: "/analytics" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path || (path === "/content" && currentPath === "/");
  const collapsed = state === "collapsed";

  return (
    <Sidebar variant="sidebar" className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border bg-gradient-subtle">
        <div className="flex h-16 items-center justify-center px-4">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-2'}`}>
            <div className="relative">
              <img 
                src="/metriore_logo_only.svg" 
                alt="Metriore" 
                className="h-8 w-8 flex-shrink-0"
              />
              <div className="absolute inset-0 rounded-full animate-pulse-glow opacity-30" />
            </div>
            {!collapsed && (
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Metriore
              </span>
            )}
            {/* TODO: version indicator */}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-gradient-subtle">
        <SidebarGroup>
          <div className="px-2 mb-4">
            <OrganizationSwitcher />
          </div>
          <SidebarGroupLabel className={collapsed ? "sr-only" : "text-muted-foreground font-medium"}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.href}
                      className={cn(
                        "transition-all duration-300 rounded-lg",
                        isActive(item.href)
                          ? "bg-gradient-primary text-primary-foreground shadow-primary hover:shadow-lg"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground hover:scale-105"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 bg-gradient-subtle">
        {!collapsed && (
          <div className="text-xs text-muted-foreground px-3 mb-2 truncate bg-muted/30 rounded-md py-1">
            {user?.email}
          </div>
        )}
        <SidebarMenuButton
          onClick={signOut}
          className="w-full justify-start text-sm hover:bg-accent/60 hover:text-accent-foreground transition-all duration-300 hover:scale-105 rounded-lg"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}