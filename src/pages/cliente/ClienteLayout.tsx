import { Outlet, useNavigate, Navigate, useLocation } from "react-router-dom";
import { useClienteAuth } from "@/hooks/useClienteAuth";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, Home, CalendarDays, History, User } from "lucide-react";
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-heading font-semibold">Domma Vistorias</p>
              <p className="text-xs text-muted-foreground">Olá, {session.nome?.split(' ')[0]}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/cliente/login'); }}>
            <LogOut className="mr-1 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      {/* Desktop sidebar + content */}
      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-56 border-r bg-card p-4 gap-1">
          {navItems.map(item => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => navigate(item.path)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t safe-area-bottom">
        <div className="flex justify-around items-center h-16">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors",
                isActive(item.path)
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
