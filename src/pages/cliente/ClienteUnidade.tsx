import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClienteAuth } from "@/hooks/useClienteAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { UnitStatusBadge } from "@/components/StatusBadge";
import { HistoricoTimeline } from "@/components/HistoricoTimeline";

export default function ClienteUnidade() {
  const { session } = useClienteAuth();

  const { data: cliente } = useQuery({
    queryKey: ['portal-unidade', session?.cliente_id],
    queryFn: async () => {
      const { data } = await supabase.from('clientes')
        .select('*, unidades(*, empreendimentos(nome))')
        .eq('id', session!.cliente_id)
        .single();
      return data;
    },
    enabled: !!session?.cliente_id,
  });

  if (!cliente) return <div className="text-muted-foreground">Carregando...</div>;
  const unidade = (cliente as any).unidades;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <Building2 className="h-6 w-6" /> Minha Unidade
      </h1>

      <Card>
        <CardContent className="pt-6 grid gap-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Empreendimento:</span><span className="font-medium">{unidade?.empreendimentos?.nome}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Bloco:</span><span>{unidade?.bloco || '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Andar:</span><span>{unidade?.andar || '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Número:</span><span className="font-medium">{unidade?.numero}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><span>{unidade?.tipo || '-'}</span></div>
          <div className="flex justify-between items-center"><span className="text-muted-foreground">Status:</span><UnitStatusBadge status={unidade?.status} /></div>
        </CardContent>
      </Card>

      {unidade?.status === 'unidade_liberada' ? (
        <Card className="border-success/50 bg-success/5">
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
            <p className="text-sm font-medium">Sua unidade está liberada para agendamento de vistoria.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <p className="text-sm font-medium">Sua unidade ainda está em processo de liberação.</p>
          </CardContent>
        </Card>
      )}

      {unidade?.id && (
        <HistoricoTimeline entidadeTipo="unidade" entidadeId={unidade.id} showMotivo={false} />
      )}
    </div>
  );
}
