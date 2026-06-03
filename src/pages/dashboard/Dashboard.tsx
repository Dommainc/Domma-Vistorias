import { CalendarDays, Users, CheckCircle2, Clock, AlertTriangle, ArrowRight, TrendingUp, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { AgendamentoStatusBadge } from "@/components/StatusBadge";
import { formatTime } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  const monthStart = startOfMonth(today).toISOString();
  const monthEnd = endOfMonth(today).toISOString();

  const hora = today.getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiroNome = (() => {
    const nome = profile?.nome ?? '';
    if (!nome) return '';
    if (nome.includes('@')) {
      const part = nome.split('@')[0].split('.')[0];
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    return nome.split(' ')[0];
  })();
  const dataFormatada = format(today, "EEEE',' d 'de' MMMM", { locale: ptBR });

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

  return (
    <div className="animate-slide-up">

      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div className="pb-8 border-b">
        <p className="text-sm text-muted-foreground capitalize mb-1">{dataFormatada}</p>
        <h1 className="font-heading text-3xl font-bold text-foreground mb-4">
          {saudacao}{primeiroNome ? `, ${primeiroNome}` : ''}.
        </h1>

        {/* Métricas em quadrados */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { value: agendamentosHoje?.length ?? 0, label: "Vistorias hoje", onClick: () => navigate('/agendamentos') },
            { value: pendentes ?? 0, label: "Agendamentos ativos", onClick: () => navigate('/agendamentos') },
            { value: concluidosMes ?? 0, label: `Concluídas em ${format(today, 'MMMM', { locale: ptBR })}`, onClick: () => navigate('/agendamentos') },
            { value: totalClientes ?? 0, label: "Total de clientes", onClick: () => navigate('/clientes') },
          ].map((m, i) => (
            <button
              key={i}
              onClick={m.onClick}
              className="flex flex-col gap-1.5 rounded-xl border bg-card px-5 py-4 text-left hover:border-primary/30 hover:bg-muted/30 transition-all"
            >
              <span className="font-heading text-4xl font-bold text-foreground tabular-nums">{m.value}</span>
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Alerta ────────────────────────────────────────────── */}
      {(alertaUnidades || 0) > 0 && (
        <div className="flex items-center gap-3 py-4 border-b text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span className="text-foreground">
            <span className="font-semibold">{alertaUnidades} unidade{alertaUnidades !== 1 ? 's' : ''}</span>
            {' '}com cliente aguardando liberação.
          </span>
          <button
            onClick={() => navigate('/unidades')}
            className="ml-auto text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0"
          >
            Ver unidades <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Conteúdo ──────────────────────────────────────────── */}
      <div className="mt-8 grid gap-12 lg:grid-cols-5">

        {/* Agenda do dia */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-base font-semibold text-foreground">Agenda de hoje</h2>
            <button
              onClick={() => navigate('/agendamentos')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              Abrir calendário <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {!agendamentosHoje?.length ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma vistoria agendada para hoje.</p>
              <button
                onClick={() => navigate('/agendamentos')}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Ver próximos agendamentos
              </button>
            </div>
          ) : (
            <div className="space-y-0 divide-y">
              {agendamentosHoje.map((a: any) => (
                <div
                  key={a.id}
                  onClick={() => navigate('/agendamentos')}
                  className="flex items-center gap-5 py-4 cursor-pointer hover:bg-muted/20 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <span className="w-14 flex-shrink-0 font-heading text-sm font-semibold text-foreground tabular-nums">
                    {formatTime(a.data_hora)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{a.clientes?.nome_completo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {a.unidades?.empreendimentos?.nome}
                      {a.unidades?.bloco ? ` · Bl. ${a.unidades.bloco.replace(/^BL\s*/i, '')}` : ''}
                      {` · Apto ${a.unidades?.numero}`}
                    </p>
                  </div>
                  <AgendamentoStatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Painel direito */}
        <div className="lg:col-span-2 space-y-8">

          {/* Pendências */}
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground mb-4">Situação geral</h2>
            <div className="space-y-5">
              {[
                {
                  icon: Clock,
                  label: "Aguardando liberação",
                  value: unidadesAguardando ?? 0,
                  color: (unidadesAguardando ?? 0) > 0 ? "text-amber-500" : "text-muted-foreground",
                  path: '/empreendimentos',
                },
                {
                  icon: CalendarDays,
                  label: "Agendamentos ativos",
                  value: pendentes ?? 0,
                  color: (pendentes ?? 0) > 0 ? "text-blue-500" : "text-muted-foreground",
                  path: '/agendamentos',
                },
                {
                  icon: CheckCircle2,
                  label: `Concluídas em ${format(today, 'MMMM', { locale: ptBR })}`,
                  value: concluidosMes ?? 0,
                  color: (concluidosMes ?? 0) > 0 ? "text-emerald-500" : "text-muted-foreground",
                  path: '/agendamentos',
                },
                {
                  icon: Users,
                  label: "Total de clientes",
                  value: totalClientes ?? 0,
                  color: "text-muted-foreground",
                  path: '/clientes',
                },
              ].map(({ icon: Icon, label, value, color, path }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="w-full flex items-center gap-3 text-left group"
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
                  <span className="text-sm text-muted-foreground flex-1 group-hover:text-foreground transition-colors">{label}</span>
                  <span className="font-heading text-sm font-bold text-foreground tabular-nums">{value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Atalhos */}
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground mb-4">Ir para</h2>
            <div className="space-y-1">
              {[
                { label: "Agendamentos", path: '/agendamentos' },
                { label: "Mapa de disponibilidade", path: '/mapa' },
                { label: "Clientes", path: '/clientes' },
                { label: "Empreendimentos", path: '/empreendimentos' },
              ].map(({ label, path }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  {label}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
