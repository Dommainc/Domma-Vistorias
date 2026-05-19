import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClienteAuth } from "@/hooks/useClienteAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CalendarDays, AlertTriangle } from "lucide-react";
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

  if (!cliente) return <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

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
    if (error || data?.error) {
      toast.error(data?.error || "Erro ao cancelar");
      return;
    }
    toast.success("Agendamento cancelado");
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-xl font-bold">Olá, {session?.nome?.split(' ')[0]} 👋</h1>

      {/* Unidade */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-4 w-4 text-primary" /> Minha Unidade
          </div>
          <div className="text-sm space-y-1">
            <p className="font-medium">{unidade?.empreendimentos?.nome}</p>
            <p className="text-muted-foreground">
              {unidade?.bloco ? `Bloco ${unidade.bloco} • ` : ''}Apto {unidade?.numero}
            </p>
          </div>
          <UnitStatusBadge status={unidade?.status} />
        </CardContent>
      </Card>

      {/* Próxima Vistoria */}
      {agendamentoAtivo ? (
        <Card className="border-info/40">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4 text-info" /> Próxima Vistoria
            </div>
            <div className="text-sm space-y-1">
              <p className="font-medium">{formatDateTime(agendamentoAtivo.data_hora)}</p>
              <AgendamentoStatusBadge status={agendamentoAtivo.status} />
            </div>
            {(() => {
              const diffHoras = (new Date(agendamentoAtivo.data_hora).getTime() - Date.now()) / (1000 * 60 * 60);
              return diffHoras >= 24 ? (
                <Button variant="destructive" size="sm" className="w-full h-11 rounded-xl" onClick={handleCancel}>
                  Cancelar Agendamento
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Cancelamento indisponível (menos de 24h para a vistoria).</p>
              );
            })()}
          </CardContent>
        </Card>
      ) : unidade?.status === 'aguardando_liberacao' ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="pt-5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-sm">Sua unidade ainda está em processo de liberação. Assim que for liberada, você poderá agendar sua vistoria.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-5 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma vistoria agendada no momento.</p>
            {canSchedule && (
              <Button className="w-full h-12 rounded-xl text-base" onClick={() => navigate('/cliente/agendamento')}>
                <CalendarDays className="mr-2 h-4 w-4" /> Agendar Vistoria
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
