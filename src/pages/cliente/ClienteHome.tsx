import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClienteAuth } from "@/hooks/useClienteAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, CalendarDays, AlertTriangle, ChevronRight, CheckCircle2, Clock } from "lucide-react";

const cleanBloco = (b: string | null) => b ? b.replace(/^BL\s*/i, '').trim() : null;
import { UnitStatusBadge, AgendamentoStatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/formatters";
import { toast } from "sonner";

export default function ClienteHome() {
  const { session } = useClienteAuth();
  const navigate = useNavigate();

  const { data: cliente } = useQuery({
    queryKey: ['portal-cliente', session?.cliente_id],
    queryFn: async () => {
      const { data } = await supabase.from('clientes')
        .select('*, unidades(*, empreendimentos(nome))')
        .eq('id', session!.cliente_id)
        .single();
      return data;
    },
    enabled: !!session?.cliente_id,
  });

  const { data: agendamentos } = useQuery({
    queryKey: ['portal-agendamentos', session?.cliente_id],
    queryFn: async () => {
      const { data } = await supabase.from('agendamentos')
        .select('*')
        .eq('cliente_id', session!.cliente_id)
        .order('data_hora', { ascending: false });
      return data || [];
    },
    enabled: !!session?.cliente_id,
  });

  if (!cliente) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const unidade = (cliente as any).unidades;
  const agendamentoAtivo = agendamentos?.find(a =>
    ['aguardando_confirmacao', 'vistoria_agendada'].includes(a.status || '')
  ) || null;

  const canSchedule = !agendamentoAtivo && unidade?.status === 'unidade_liberada' && unidade?.disponibilidade_ativa;

  const handleCancel = async () => {
    if (!agendamentoAtivo) return;
    const dataHora = new Date(agendamentoAtivo.data_hora);
    const diffHoras = (dataHora.getTime() - Date.now()) / (1000 * 60 * 60);
    if (diffHoras < 24) {
      toast.error("Cancelamento não permitido com menos de 24h de antecedência.");
      return;
    }
    if (!confirm("Tem certeza que deseja cancelar sua vistoria?")) return;
    const { data, error } = await supabase.functions.invoke('cancel-agendamento', {
      body: { agendamento_id: agendamentoAtivo.id, cancelado_por_tipo: 'cliente' },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "Erro ao cancelar");
      return;
    }
    toast.success("Agendamento cancelado");
    window.location.reload();
  };

  const totalVistorias = agendamentos?.length ?? 0;
  const concluidas = agendamentos?.filter(a => a.status === 'vistoria_concluida').length ?? 0;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Hero card */}
      <div
        className="rounded-2xl p-5 text-white"
        style={{ background: "linear-gradient(135deg, #1a2744 0%, #1e3a5f 100%)" }}
      >
        <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">Portal do Cliente</p>
        <h1 className="font-heading text-xl font-bold mb-4">
          Olá, {session?.nome?.split(' ')[0]}!
        </h1>
        <div className="flex gap-4">
          <div className="flex-1 rounded-xl bg-white/10 p-3 text-center">
            <p className="font-heading text-2xl font-bold">{totalVistorias}</p>
            <p className="text-blue-200 text-xs mt-0.5">Vistorias</p>
          </div>
          <div className="flex-1 rounded-xl bg-white/10 p-3 text-center">
            <p className="font-heading text-2xl font-bold">{concluidas}</p>
            <p className="text-blue-200 text-xs mt-0.5">Concluídas</p>
          </div>
          <div className="flex-1 rounded-xl bg-white/10 p-3 text-center">
            <p className="font-heading text-2xl font-bold">{agendamentoAtivo ? 1 : 0}</p>
            <p className="text-blue-200 text-xs mt-0.5">Ativas</p>
          </div>
        </div>
      </div>

      {/* Unidade */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Minha Unidade</span>
          </div>
          <button
            onClick={() => navigate('/cliente/unidade')}
            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-sm font-medium text-foreground">{unidade?.empreendimentos?.nome}</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">
          {cleanBloco(unidade?.bloco) ? `Bloco ${cleanBloco(unidade.bloco)} • ` : ''}Apartamento {unidade?.numero}
        </p>
        <UnitStatusBadge status={unidade?.status} />
      </div>

      {/* Vistoria status */}
      {agendamentoAtivo ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-blue-900">Próxima Vistoria</span>
          </div>
          <p className="text-sm font-medium text-blue-900">{formatDateTime(agendamentoAtivo.data_hora)}</p>
          <div className="mt-2 mb-4">
            <AgendamentoStatusBadge status={agendamentoAtivo.status} />
          </div>
          {(() => {
            const diffHoras = (new Date(agendamentoAtivo.data_hora).getTime() - Date.now()) / (1000 * 60 * 60);
            return diffHoras >= 24 ? (
              <Button
                variant="destructive"
                size="sm"
                className="w-full h-10 rounded-xl"
                onClick={handleCancel}
              >
                Cancelar Agendamento
              </Button>
            ) : (
              <p className="text-xs text-blue-600 bg-blue-100 rounded-lg p-2 text-center">
                Cancelamento indisponível — menos de 24h para a vistoria.
              </p>
            );
          })()}
        </div>
      ) : unidade?.status === 'aguardando_liberacao' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">Aguardando liberação</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Sua unidade ainda está em processo de liberação. Assim que for liberada, você poderá agendar sua vistoria.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mx-auto mb-3">
            {concluidas > 0 ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            ) : (
              <Clock className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            {concluidas > 0 ? "Vistoria concluída com sucesso!" : "Nenhuma vistoria agendada"}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {concluidas > 0
              ? "Consulte seu histórico para mais detalhes."
              : canSchedule
                ? "Agende sua vistoria agora mesmo."
                : "Fique de olho — em breve você poderá agendar."}
          </p>
          {canSchedule && (
            <Button
              className="w-full h-11 rounded-xl font-semibold"
              onClick={() => navigate('/cliente/agendamento')}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Agendar Vistoria
            </Button>
          )}
          {concluidas > 0 && (
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl"
              onClick={() => navigate('/cliente/historico')}
            >
              Ver Histórico
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
