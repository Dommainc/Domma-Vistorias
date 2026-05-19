import {
  Home,
  Building2,
  DoorOpen,
  Users,
  CalendarDays,
  UserCog,
  LogOut,
  Settings,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  useSidebar,
} from "@/components/ui/sidebar";

const adminItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Empreendimentos", url: "/empreendimentos", icon: Building2 },
  { title: "Unidades", url: "/unidades", icon: DoorOpen },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Agendamentos", url: "/agendamentos", icon: CalendarDays },
  { title: "Usuários", url: "/usuarios", icon: UserCog },
  { title: "Configurações", url: "/configuracoes/agendamentos", icon: Settings },
];

const vistoriadorItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Unidades", url: "/unidades", icon: DoorOpen },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Agendamentos", url: "/agendamentos", icon: CalendarDays },
  { title: "Configurações", url: "/configuracoes/agendamentos", icon: Settings },
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
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            {!collapsed && (
              <span className="font-heading text-lg font-bold tracking-tight text-sidebar-primary">
                Domma Vistorias
              </span>
            )}
            {collapsed && (
              <span className="font-heading text-lg font-bold text-sidebar-primary">D</span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-4">
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
