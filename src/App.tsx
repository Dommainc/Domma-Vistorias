import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ClienteAuthProvider } from "@/hooks/useClienteAuth";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Login from "@/pages/auth/Login";
import Dashboard from "@/pages/dashboard/Dashboard";
import Empreendimentos from "@/pages/empreendimentos/Empreendimentos";
import EmpreendimentoForm from "@/pages/empreendimentos/EmpreendimentoForm";
import LiberacaoUnidades from "@/pages/empreendimentos/LiberacaoUnidades";
import Unidades from "@/pages/unidades/Unidades";
import UnidadeDetalhe from "@/pages/unidades/UnidadeDetalhe";
import Clientes from "@/pages/clientes/Clientes";
import ClienteForm from "@/pages/clientes/ClienteForm";
import ClienteDetalhe from "@/pages/clientes/ClienteDetalhe";
import Agendamentos from "@/pages/agendamentos/Agendamentos";


import ClienteLogin from "@/pages/cliente/ClienteLogin";
import ClienteLayout from "@/pages/cliente/ClienteLayout";
import ClienteHome from "@/pages/cliente/ClienteHome";
import ClienteAgendamento from "@/pages/cliente/ClienteAgendamento";
import ClienteHistorico from "@/pages/cliente/ClienteHistorico";
import ClienteUnidade from "@/pages/cliente/ClienteUnidade";
import MapaDisponibilidade from "@/pages/mapa/MapaDisponibilidade";
import Configuracoes from "@/pages/configuracoes/Configuracoes";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AdminPage = ({ children, allowedProfiles }: { children: React.ReactNode; allowedProfiles?: ('admin' | 'vistoriador' | 'relacionamento')[] }) => (
  <ProtectedRoute allowedProfiles={allowedProfiles as any}>
    <AdminLayout>{children}</AdminLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ClienteAuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Redirect old /agendar/:token to portal */}
              <Route path="/agendar/:token" element={<Navigate to="/cliente/login" replace />} />

              {/* Client Portal */}
              <Route path="/cliente/login" element={<ClienteLogin />} />
              <Route path="/cliente" element={<ClienteLayout />}>
                <Route index element={<ClienteHome />} />
                <Route path="agendamento" element={<ClienteAgendamento />} />
                <Route path="historico" element={<ClienteHistorico />} />
                <Route path="unidade" element={<ClienteUnidade />} />
              </Route>

              {/* Admin routes */}
              <Route path="/" element={<AdminPage><Dashboard /></AdminPage>} />
              <Route path="/empreendimentos" element={<AdminPage allowedProfiles={['admin']}><Empreendimentos /></AdminPage>} />
              <Route path="/empreendimentos/novo" element={<AdminPage allowedProfiles={['admin']}><EmpreendimentoForm /></AdminPage>} />
              <Route path="/empreendimentos/:id/editar" element={<AdminPage allowedProfiles={['admin']}><EmpreendimentoForm /></AdminPage>} />
              <Route path="/empreendimentos/:id/liberacao" element={<AdminPage allowedProfiles={['admin', 'vistoriador', 'relacionamento']}><LiberacaoUnidades /></AdminPage>} />
              <Route path="/unidades" element={<AdminPage><Unidades /></AdminPage>} />
              <Route path="/unidades/:id" element={<AdminPage><UnidadeDetalhe /></AdminPage>} />
              <Route path="/clientes" element={<AdminPage><Clientes /></AdminPage>} />
              <Route path="/clientes/novo" element={<AdminPage><ClienteForm /></AdminPage>} />
              <Route path="/clientes/:id" element={<AdminPage><ClienteDetalhe /></AdminPage>} />
              <Route path="/agendamentos" element={<AdminPage><Agendamentos /></AdminPage>} />
              <Route path="/configuracoes" element={<AdminPage><Configuracoes /></AdminPage>} />
              <Route path="/configuracoes/agendamentos" element={<Navigate to="/configuracoes" replace />} />
              <Route path="/usuarios" element={<Navigate to="/configuracoes" replace />} />
              <Route path="/mapa" element={<AdminPage><MapaDisponibilidade /></AdminPage>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ClienteAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
