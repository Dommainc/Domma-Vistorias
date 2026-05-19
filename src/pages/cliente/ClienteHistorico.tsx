import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClienteAuth } from "@/hooks/useClienteAuth";
import { Card, CardContent } from "@/components/ui/card";
import { AgendamentoStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/formatters";
import { toast } from "sonner";

export default function ClienteHistorico() {
  const { session } = useClienteAuth();

  const { data: agendamentos, refetch } = useQuery({
    queryKey: ['portal-historico', session?.cliente_id],
    queryFn: async () => {
      const { data } = await supabase.from('agendamentos')
        .select('*, unidades(numero, bloco, empreendimentos(nome))')
        .eq('cliente_id', session!.cliente_id)
        .order('data_hora', { ascending: false });
      return data || [];
    },
    enabled: !!session?.cliente_id,
  });

  const handleCancel = async (agendamento: any) => {
    const diffHoras = (new Date(agendamento.data_hora).getTime() - Date.now()) / (1000 * 60 * 60);
    if (diffHoras < 24) {
      toast.error("Cancelamento não permitido com menos de 24h de antecedência.");
      return;
    }
    if (!confirm("Tem certeza que deseja cancelar esta vistoria?")) return;
    const { data, error } = await supabase.functions.invoke('cancel-agendamento', {
      body: { agendamento_id: agendamento.id, cancelado_por_tipo: 'cliente' },
    });
    if (error || data?.error) {
      toast.error(data?.error || "Erro ao cancelar");
      return;
    }
    toast.success("Agendamento cancelado");
    refetch();
  };

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-lg font-bold">Meus Agendamentos</h1>

      {!agendamentos?.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="space-y-3">
          {agendamentos.map((a: any) => {
            const isActive = ['aguardando_confirmacao', 'vistoria_agendada'].includes(a.status);
            const diffHoras = isActive ? (new Date(a.data_hora).getTime() - Date.now()) / (1000 * 60 * 60) : 0;
            const canCancel = isActive && diffHoras >= 24;

            return (
              <Card key={a.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{formatDateTime(a.data_hora)}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.unidades?.empreendimentos?.nome} — {a.unidades?.bloco ? a.unidades.bloco + '-' : ''}{a.unidades?.numero}
                      </p>
                    </div>
                    <AgendamentoStatusBadge status={a.status} />
                  </div>
                  {canCancel && (
                    <Button variant="destructive" size="sm" className="w-full h-10 rounded-xl" onClick={() => handleCancel(a)}>
                      Cancelar
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
