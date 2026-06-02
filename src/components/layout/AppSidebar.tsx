import {
  Home,
  Building2,
  CalendarDays,
  LogOut,
  Settings,
  Map,
  Users,
  ChevronRight,
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
  { title: "Início", url: "/", icon: Home },
  { title: "Empreendimentos", url: "/empreendimentos", icon: Building2 },
  { title: "Agendamentos", url: "/agendamentos", icon: CalendarDays },
  { title: "Mapa", url: "/mapa", icon: Map },
  { title: "Clientes", url: "/clientes", icon: Users },
];

const vistoriadorItems = [
  { title: "Início", url: "/", icon: Home },
  { title: "Agendamentos", url: "/agendamentos", icon: CalendarDays },
  { title: "Mapa", url: "/mapa", icon: Map },
];

const PERFIL_LABEL: Record<string, string> = {
  admin: "Administrador",
  vistoriador: "Vistoriador",
  relacionamento: "Relacionamento",
  gerente: "Gerente",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const perfil = profile?.perfil ?? "vistoriador";
  const items = perfil === "admin" ? adminItems : vistoriadorItems;
  const perfilLabel = PERFIL_LABEL[perfil] ?? perfil;

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  // Initials for avatar
  const initials = profile?.nome
    ? profile.nome.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()
    : "?";

  return (
    <Sidebar collapsible="icon">
      {/* Brand header */}
      <SidebarHeader className="px-3 py-4 border-b border-sidebar-border/60">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo mark */}
          <div className="relative flex-shrink-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/60 flex items-center justify-center shadow-lg shadow-sidebar-primary/20">
              <img src="/logo-domma.png" alt="Domma" className="h-5 w-5 object-contain" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-sidebar-background" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-white leading-none tracking-tight truncate">
                Domma Vistorias
              </p>
              <p className="text-[10px] text-sidebar-foreground/40 mt-1 truncate">
                Sistema de vistorias
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 flex flex-col gap-1">
        {/* Main nav */}
        <SidebarGroup className="p-0">
          {!collapsed && (
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 select-none">
              Menu
            </p>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="h-9 rounded-lg"
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={[
                          "flex items-center gap-3 px-3 w-full rounded-lg transition-all duration-150",
                          "text-sidebar-foreground/60 hover:text-white hover:bg-white/8",
                        ].join(" ")}
                        activeClassName="bg-sidebar-primary/15 text-white"
                      >
                        <item.icon
                          className={[
                            "h-4 w-4 flex-shrink-0 transition-colors",
                            active ? "text-sidebar-primary" : "",
                          ].join(" ")}
                          strokeWidth={active ? 2.5 : 1.75}
                        />
                        {!collapsed && (
                          <span className={["text-sm flex-1 truncate", active ? "font-medium" : ""].join(" ")}>
                            {item.title}
                          </span>
                        )}
                        {!collapsed && active && (
                          <ChevronRight className="h-3 w-3 text-sidebar-primary/60 flex-shrink-0" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom section: settings */}
        <SidebarGroup className="p-0">
          {!collapsed && (
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 select-none">
              Sistema
            </p>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/configuracoes")}
                  tooltip="Configurações"
                  className="h-9 rounded-lg"
                >
                  <NavLink
                    to="/configuracoes"
                    className={[
                      "flex items-center gap-3 px-3 w-full rounded-lg transition-all duration-150",
                      "text-sidebar-foreground/60 hover:text-white hover:bg-white/8",
                    ].join(" ")}
                    activeClassName="bg-sidebar-primary/15 text-white"
                  >
                    <Settings
                      className={["h-4 w-4 flex-shrink-0", isActive("/configuracoes") ? "text-sidebar-primary" : ""].join(" ")}
                      strokeWidth={isActive("/configuracoes") ? 2.5 : 1.75}
                    />
                    {!collapsed && <span className="text-sm truncate">Configurações</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: user + logout */}
      <SidebarFooter className="border-t border-sidebar-border/60 px-2 py-3">
        {!collapsed && profile && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1 rounded-xl bg-white/5 border border-white/8">
            {/* Avatar */}
            <div className="h-7 w-7 rounded-lg bg-sidebar-primary/20 border border-sidebar-primary/30 flex-shrink-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-sidebar-primary">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate leading-none">{profile.nome}</p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate mt-0.5">{perfilLabel}</p>
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip="Sair"
              className="h-9 rounded-lg text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors gap-3 px-3"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="text-sm">Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
