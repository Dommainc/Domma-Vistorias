import {
  Home,
  Building2,
  CalendarDays,
  LogOut,
  Settings,
  Map,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const adminItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Empreendimentos", url: "/empreendimentos", icon: Building2 },
  { title: "Agendamentos", url: "/agendamentos", icon: CalendarDays },
  { title: "Mapa", url: "/mapa", icon: Map },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

const vistoriadorItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Agendamentos", url: "/agendamentos", icon: CalendarDays },
  { title: "Mapa", url: "/mapa", icon: Map },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const items = profile?.perfil === "admin" ? adminItems : vistoriadorItems;
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      {/* Logo / brand */}
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/20 border border-sidebar-primary/30">
            <Building2 className="h-4 w-4 text-sidebar-primary" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-heading text-sm font-bold text-white truncate leading-none">
                Domma Vistorias
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 mt-0.5 truncate">
                {profile?.perfil === "admin" ? "Administrador" : "Vistoriador"}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-9 rounded-lg transition-all duration-150"
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent rounded-lg"
                      activeClassName="bg-sidebar-accent text-white font-medium"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
        {!collapsed && profile && (
          <div className="px-3 py-2 mb-1 rounded-lg bg-sidebar-accent/40">
            <p className="text-xs font-medium text-white truncate">{profile.nome}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{profile.email}</p>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip="Sair"
              className="h-9 rounded-lg text-sidebar-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="text-sm">Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
