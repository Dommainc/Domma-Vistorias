import { CalendarDays, Users, CheckCircle2, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AgendamentoStatusBadge } from "@/components/StatusBadge";
import { formatTime } from "@/lib/formatters";

export default function Dashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  const monthStart = startOfMonth(today).toISOString();
  const monthEnd = endOfMonth(today).toISOString();

  const { data: agendamentosHoje } = useQuery({
    queryKey: ['dash-agendamentos-hoje'],
    queryFn: async () => {
      const { data } = await supabase.from('agendamentos')
        .select('*, clientes(nome_completo), unidades(numero, bloco, empreendimentos(nome))')
        .gte('data_hora', todayStart).lte('data_hora', todayEnd)
        .in('status', ['vistoria_agendada', 'aguardando_confirmacao'])
        .order('data_hora');
      return data || [];
    },
  });

  const { data: pendentes } = useQuery({
    queryKey: ['dash-pendentes'],
    queryFn: async () => {
      const { count } = await supabase.from('agendamentos').select('id', { count: 'exact', head: true })
        .in('status', ['vistoria_agendada', 'aguardando_confirmacao']);
      return count || 0;
    },
  });

  const { data: concluidosMes } = useQuery({
    queryKey: ['dash-concluidos-mes'],
    queryFn: async () => {
      const { count } = await supabase.from('agendamentos').select('id', { count: 'exact', head: true })
        .eq('status', 'vistoria_concluida')
        .gte('realizado_em', monthStart).lte('realizado_em', monthEnd);
      return count || 0;
    },
  });

  const { data: totalClientes } = useQuery({
    queryKey: ['dash-clientes'],
    queryFn: async () => {
      const { count } = await supabase.from('clientes').select('id', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: unidadesAguardando } = useQuery({
    queryKey: ['dash-unidades-aguardando'],
    queryFn: async () => {
      const { count } = await supabase.from('unidades').select('id', { count: 'exact', head: true })
        .eq('status', 'aguardando_liberacao');
      return count || 0;
    },
  });

  const { data: alertaUnidades } = useQuery({
    queryKey: ['dash-alerta-unidades'],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, unidades!inner(status)')
        .eq('unidades.status', 'aguardando_liberacao');
      return data?.length || 0;
    },
  });

  const stats = [
    {
      label: "Vistorias Hoje",
      value: agendamentosHoje?.length ?? 0,
      icon: CalendarDays,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      accent: "#3B82F6",
    },
    {
      label: "Agendamentos Ativos",
      value: pendentes ?? 0,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      accent: "#F59E0B",
    },
    {
      label: "Concluídos no Mês",
      value: concluidosMes ?? 0,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      accent: "#10B981",
    },
    {
      label: "Total de Clientes",
      value: totalClientes ?? 0,
      icon: Users,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      accent: "#7C3AED",
    },
    {
      label: "Aguardando Liberação",
      value: unidadesAguardando ?? 0,
      icon: Clock,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      accent: "#EA580C",
      onClick: () => navigate('/unidades'),
    },
  ];

  const quickActions = [
    { label: "Ver Agendamentos", icon: CalendarDays, path: '/agendamentos' },
    { label: "Gerenciar Unidades", icon: Clock, path: '/unidades' },
    { label: "Novo Cliente", icon: Users, path: '/clientes/novo' },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Page heading */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Home</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral do sistema de vistorias</p>
      </div>

      {/* Alert banner */}
      {(alertaUnidades || 0) > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {alertaUnidades} unidade(s) com cliente aguardando liberação
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Clientes estão esperando, mas as unidades ainda não foram liberadas.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="flex-shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => navigate('/unidades')}
          >
            Ver Unidades
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={`stat-card-accent border shadow-sm transition-all duration-200 ${stat.onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
            style={{ '--tw-shadow-color': stat.accent } as React.CSSProperties}
            onClick={stat.onClick}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
              style={{ background: stat.accent }}
            />
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground leading-none mb-2">{stat.label}</p>
                  <p className="font-heading text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail cards */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Today's schedule */}
        <Card className="lg:col-span-3 border shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Vistorias Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {!agendamentosHoje?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <CalendarDays className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Nenhuma vistoria hoje</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Aproveite para adiantar outras tarefas!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {agendamentosHoje.map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{a.clientes?.nome_completo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.unidades?.empreendimentos?.nome} — {a.unidades?.bloco ? a.unidades.bloco + '-' : ''}{a.unidades?.numero}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right ml-4">
                      <p className="font-semibold text-foreground">{formatTime(a.data_hora)}</p>
                      <AgendamentoStatusBadge status={a.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {quickActions.map(({ label, icon: Icon, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium text-foreground hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 group"
              >
                <Icon className="h-4 w-4 text-primary group-hover:text-white transition-colors flex-shrink-0" />
                {label}
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground group-hover:text-white/70 transition-colors" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
