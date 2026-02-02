import { LayoutDashboard, Radio, Users, MessageSquare, Snowflake, Clock, Smartphone, ClipboardList } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useWhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import logoArttico from "@/assets/logo-arttico.webp";

const navigationItems = [{
  title: "Dashboard",
  url: "/",
  icon: LayoutDashboard
}, {
  title: "Monitoramento",
  url: "/monitoring",
  icon: Radio
}, {
  title: "Demandas Pendentes",
  url: "/pending-demands",
  icon: ClipboardList
}];

const configItems = [{
  title: "Grupos",
  url: "/settings/groups",
  icon: MessageSquare
}, {
  title: "Equipe",
  url: "/settings/team",
  icon: Users
}, {
  title: "SLA",
  url: "/settings",
  icon: Clock
}];

export function AppSidebar() {
  const { status } = useWhatsAppStatus();

  const getStatusDot = () => {
    switch (status) {
      case 'connected':
        return <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />;
      case 'partial':
        return <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />;
      case 'loading':
        return <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />;
      default:
        return <div className="h-2 w-2 rounded-full bg-destructive" />;
    }
  };

  return <Sidebar className="border-r border-sidebar-border/50 frosted-glass">
    <SidebarHeader className="p-4 border-b border-sidebar-border/50">
      <div className="flex items-center gap-3">
        <div className="relative">
          <img src={logoArttico} alt="Agência Arttico" className="h-10 w-auto" />
          <Snowflake className="absolute -top-1 -right-1 h-4 w-4 text-primary animate-pulse" />
        </div>
        <div className="flex flex-col">

          <span className="text-xs text-muted-foreground">O X9 do Atendimento ❄️</span>
        </div>
      </div>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navigationItems.map(item => <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink to={item.url} end={item.url === "/"} className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors" activeClassName="bg-primary text-primary-foreground">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Configurações</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {configItems.map(item => <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink to={item.url} end={item.url === "/settings"} className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors" activeClassName="bg-primary text-primary-foreground">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>)}

            {/* WhatsApp Connection with Status Indicator */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/settings/whatsapp"
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  activeClassName="bg-primary text-primary-foreground"
                >
                  <div className="relative">
                    <Smartphone className="h-4 w-4" />
                    <div className="absolute -bottom-0.5 -right-0.5">
                      {getStatusDot()}
                    </div>
                  </div>
                  <span>WhatsApp</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter className="p-4 border-t border-sidebar-border">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Tema</span>
        <ThemeToggle />
      </div>
    </SidebarFooter>
  </Sidebar>;
}