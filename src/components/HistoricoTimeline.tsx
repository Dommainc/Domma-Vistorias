import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";

interface Props {
  entidadeTipo: 'unidade' | 'agendamento';
  entidadeId: string;
  showMotivo?: boolean;
}

export function HistoricoTimeline({ entidadeTipo, entidadeId, showMotivo = true }: Props) {
  const { data: historico } = useQuery({
    queryKey: ['historico', entidadeTipo, entidadeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_status')
        .select('*')
        .eq('entidade_tipo', entidadeTipo)
        .eq('entidade_id', entidadeId)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!historico || historico.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" /> Histórico de Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4 pl-6 border-l-2 border-border">
          {historico.map((h: any) => (
            <div key={h.id} className="relative">
              <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    {formatDateTime(h.criado_em)}
                  </span>
                  {' — '}
                  {h.status_anterior
                    ? <>Status alterado para "<span className="font-medium">{formatStatus(h.status_novo)}</span>"</>
                    : <>Status inicial: "<span className="font-medium">{formatStatus(h.status_novo)}</span>"</>
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  por: {h.alterado_por_nome || 'Sistema'} ({h.alterado_por_tipo || 'sistema'})
                </p>
                {showMotivo && h.motivo && (
                  <p className="text-xs text-muted-foreground italic">Motivo: {h.motivo}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatStatus(s: string): string {
  const map: Record<string, string> = {
    aguardando_liberacao: 'Aguardando Liberação',
    unidade_liberada: 'Unidade Liberada',
    vistoria_agendada: 'Vistoria Agendada',
    vistoria_finalizada: 'Vistoria Finalizada',
    vistoria_cancelada: 'Vistoria Cancelada',
    disponibilidade_ativa: 'Disponibilidade Ativada',
    disponibilidade_inativa: 'Disponibilidade Desativada',
  };
  return map[s] || s;
}
