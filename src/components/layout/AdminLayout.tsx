import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/": "Home",
  "/empreendimentos": "Empreendimentos",
  "/unidades": "Unidades",
  "/clientes": "Clientes",
  "/agendamentos": "Agendamentos",
  "/usuarios": "Usuários",
  "/configuracoes/agendamentos": "Configurações",
};

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/mapa/")) return "Mapa de Disponibilidade";
  for (const [key, label] of Object.entries(pageTitles)) {
    if (key !== "/" && pathname.startsWith(key)) return label;
  }
  if (pathname === "/") return "Home";
  return "Domma Vistorias";
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const location = useLocation();
  const title = getPageTitle(location.pathname);
  const initials = profile?.nome
    ?.split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() ?? "?";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="hidden sm:block h-4 w-px bg-border" />
              <h2 className="hidden sm:block font-heading text-sm font-semibold text-foreground">
                {title}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-foreground leading-none">{profile?.nome}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                  {profile?.perfil === "admin" ? "Administrador" : "Vistoriador"}
                </p>
              </div>
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                style={{ background: "linear-gradient(135deg, #1a2744 0%, #1e3a5f 100%)" }}
                aria-label={profile?.nome}
              >
                {initials}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-6 animate-fade-in">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
