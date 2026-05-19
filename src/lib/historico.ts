import { supabase } from "@/integrations/supabase/client";

export async function registrarHistorico(params: {
  entidade_tipo: 'unidade' | 'agendamento';
  entidade_id: string;
  status_anterior: string | null;
  status_novo: string;
  alterado_por_tipo: 'sistema' | 'admin' | 'vistoriador' | 'cliente';
  alterado_por_id?: string;
  alterado_por_nome?: string;
  motivo?: string;
}) {
  await supabase.from('historico_status').insert({
    entidade_tipo: params.entidade_tipo,
    entidade_id: params.entidade_id,
    status_anterior: params.status_anterior,
    status_novo: params.status_novo,
    alterado_por_tipo: params.alterado_por_tipo,
    alterado_por_id: params.alterado_por_id || null,
    alterado_por_nome: params.alterado_por_nome || null,
    motivo: params.motivo || null,
  } as any);
}
