import { CalendarDays, Users, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
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
    { label: "Vistorias Hoje", value: String(agendamentosHoje?.length || 0), icon: CalendarDays, color: "text-info" },
    { label: "Agendamentos Ativos", value: String(pendentes || 0), icon: Clock, color: "text-warning" },
    { label: "Concluídos no Mês", value: String(concluidosMes || 0), icon: CheckCircle2, color: "text-success" },
    { label: "Clientes Cadastrados", value: String(totalClientes || 0), icon: Users, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Home</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema de vistorias</p>
      </div>

      {(alertaUnidades || 0) > 0 && (
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">{alertaUnidades} unidade(s) com cliente vinculado aguardando liberação</p>
            <p className="text-xs text-muted-foreground">Clientes estão esperando, mas as unidades ainda não foram liberadas.</p>
          </div>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => navigate('/unidades')}>
            Ver Unidades
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-heading">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
        <Card className="animate-fade-in cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/unidades')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando Liberação</CardTitle>
            <Clock className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading">{unidadesAguardando || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Vistorias Hoje</CardTitle></CardHeader>
          <CardContent>
            {!agendamentosHoje?.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma vistoria agendada para hoje.</p>
            ) : (
              <div className="space-y-3">
                {agendamentosHoje.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-sm border rounded p-2">
                    <div>
                      <p className="font-medium">{a.clientes?.nome_completo}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.unidades?.empreendimentos?.nome} - {a.unidades?.bloco ? a.unidades.bloco + '-' : ''}{a.unidades?.numero}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatTime(a.data_hora)}</p>
                      <AgendamentoStatusBadge status={a.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Ações Rápidas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/agendamentos')}>
              <CalendarDays className="mr-2 h-4 w-4" /> Ver Agendamentos
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/unidades')}>
              <Clock className="mr-2 h-4 w-4" /> Gerenciar Unidades
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/clientes/novo')}>
              <Users className="mr-2 h-4 w-4" /> Novo Cliente
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
