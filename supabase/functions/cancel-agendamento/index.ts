import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-client-session',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { agendamento_id, cancelado_por_tipo } = await req.json();
    if (!agendamento_id) throw new Error('agendamento_id obrigatório');

    // Get agendamento
    const { data: ag } = await supabaseAdmin.from('agendamentos')
      .select('*').eq('id', agendamento_id).single();
    if (!ag) throw new Error('Agendamento não encontrado');
    if (!['aguardando_confirmacao', 'vistoria_agendada'].includes(ag.status)) {
      throw new Error('Agendamento não pode ser cancelado');
    }

    // If client cancellation, check 24h rule
    if (cancelado_por_tipo === 'cliente') {
      const { data: configs } = await supabaseAdmin.from('configuracoes')
        .select('valor').eq('chave', 'agendamento_cancelamento_antecedencia_horas').single();
      const minHoras = parseInt(configs?.valor || '24');
      
      const agora = new Date();
      const dataHora = new Date(ag.data_hora);
      const diffHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60);
      
      if (diffHoras < minHoras) {
        return new Response(JSON.stringify({
          error: `Cancelamento não permitido. Faltam menos de ${minHoras}h para a vistoria.`
        }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Cancel
    const { error } = await supabaseAdmin.from('agendamentos').update({
      status: 'vistoria_cancelada',
      cancelado_em: new Date().toISOString(),
      cancelado_por_tipo,
    }).eq('id', agendamento_id);
    if (error) throw error;

    // Log history
    await supabaseAdmin.from('historico_status').insert({
      entidade_tipo: 'agendamento',
      entidade_id: agendamento_id,
      status_anterior: ag.status,
      status_novo: 'vistoria_cancelada',
      alterado_por_tipo: cancelado_por_tipo || 'sistema',
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
