import { Outlet, useNavigate, Navigate, useLocation } from "react-router-dom";
import { useClienteAuth } from "@/hooks/useClienteAuth";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, Home, CalendarDays, History, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: '/cliente', label: 'Início', icon: Home },
  { path: '/cliente/agendamento', label: 'Agendar', icon: CalendarDays },
  { path: '/cliente/historico', label: 'Histórico', icon: History },
  { path: '/cliente/unidade', label: 'Unidade', icon: Building2 },
];

export default function ClienteLayout() {
  const { session, loading, logout } = useClienteAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, #0d1829 0%, #1a2744 100%)" }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/cliente/login" replace />;
  }

  const isActive = (path: string) => {
    if (path === '/cliente') return location.pathname === '/cliente';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
              style={{ background: "linear-gradient(135deg, #1a2744 0%, #1e3a5f 100%)" }}
            >
              <img src="/logo-domma.png" alt="Domma" className="h-5 w-5 object-contain" />
            </div>
            <div>
              <p className="text-sm font-heading font-bold text-foreground leading-none">Domma Vistorias</p>
              <p className="text-xs text-muted-foreground mt-0.5">Olá, {session.nome?.split(' ')[0]} 👋</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { logout(); navigate('/cliente/login'); }}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="mr-1 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      {/* Desktop sidebar + content */}
      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-56 border-r bg-card/50 p-4 gap-1">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive(item.path)
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </button>
          ))}
          <div className="mt-2 pt-2 border-t">
            <a
              href="https://domma.cvcrm.com.br/cliente/home"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
            >
              <ExternalLink className="h-4 w-4 flex-shrink-0" />
              Portal CV
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 w-full px-4 py-5 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t safe-area-bottom shadow-lg">
        <div className="flex justify-around items-center h-16">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full text-xs font-medium transition-colors",
                isActive(item.path)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-transform",
                isActive(item.path) ? "scale-110" : ""
              )} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
