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

    const { unidade_id, data } = await req.json();
    if (!unidade_id || !data) throw new Error('Missing params');

    const { data: unidade } = await supabaseAdmin.from('unidades')
      .select('*, empreendimentos(nome)')
      .eq('id', unidade_id)
      .single();

    if (!unidade) throw new Error('Unidade não encontrada');
    if (unidade.status !== 'unidade_liberada') throw new Error('Unidade aguardando liberação');
    if (!unidade.disponibilidade_ativa) throw new Error('Unidade sem disponibilidade ativa');

    const { data: configs } = await supabaseAdmin.from('configuracoes')
      .select('chave, valor')
      .in('chave', ['tempo_medio_vistoria_minutos', 'agendamento_antecedencia_minima_dias']);

    let tempoMedio = 60;
    let antecedenciaDias = 7;
    if (configs) {
      for (const c of configs) {
        if (c.chave === 'tempo_medio_vistoria_minutos') tempoMedio = parseInt(c.valor) || 60;
        if (c.chave === 'agendamento_antecedencia_minima_dias') antecedenciaDias = parseInt(c.valor) || 7;
      }
    }

    if (unidade.disponibilidade_data_inicio && data < unidade.disponibilidade_data_inicio) {
      return new Response(JSON.stringify({ slots: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (unidade.disponibilidade_data_fim && data > unidade.disponibilidade_data_fim) {
      return new Response(JSON.stringify({ slots: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dayOfWeek = new Date(data + 'T12:00:00').getDay();
    const diasDisponiveis = unidade.disponibilidade_dias_semana || [1, 2, 3, 4, 5];
    if (!diasDisponiveis.includes(dayOfWeek)) {
      return new Response(JSON.stringify({ slots: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const requestedDate = new Date(data + 'T00:00:00');
    const minDate = new Date(now.getTime() + antecedenciaDias * 24 * 60 * 60 * 1000);
    if (requestedDate < new Date(minDate.toISOString().split('T')[0] + 'T00:00:00')) {
      return new Response(JSON.stringify({ slots: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const horaInicio = unidade.disponibilidade_hora_inicio || '08:00';
    const horaFim = unidade.disponibilidade_hora_fim || '17:00';
    const [startH, startM] = horaInicio.split(':').map(Number);
    const [endH, endM] = horaFim.split(':').map(Number);

    const slots = [];
    let minutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (minutes + tempoMedio <= endMinutes) {
      const h = String(Math.floor(minutes / 60)).padStart(2, '0');
      const m = String(minutes % 60).padStart(2, '0');
      const hora = `${h}:${m}`;

      const slotDateTime = `${data}T${hora}:00`;
      const { count } = await supabaseAdmin.from('agendamentos')
        .select('id', { count: 'exact', head: true })
        .eq('unidade_id', unidade_id)
        .eq('data_hora', slotDateTime)
        .in('status', ['aguardando_confirmacao', 'vistoria_agendada']);

      const used = count || 0;
      slots.push({ hora, disponivel: used < 1, vagas_restantes: Math.max(0, 1 - used) });
      minutes += tempoMedio;
    }

    return new Response(JSON.stringify({ slots }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
