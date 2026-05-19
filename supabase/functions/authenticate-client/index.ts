import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { cpf, data_nascimento } = await req.json();
    if (!cpf || !data_nascimento) throw new Error('CPF e data de nascimento são obrigatórios');

    // Normalize CPF: remove all non-digits
    const cpfDigits = cpf.replace(/\D/g, '');
    
    // Normalize date: ensure YYYY-MM-DD format
    const dataNorm = data_nascimento.trim();

    console.log('Auth attempt:', { cpfDigits, dataNorm });

    const { data: clientes, error } = await supabaseAdmin
      .from('clientes')
      .select('id, nome_completo, email, unidade_id')
      .eq('cpf', cpfDigits)
      .eq('data_nascimento', dataNorm);

    if (error) {
      console.error('Query error:', error);
      throw error;
    }
    
    console.log('Query result:', { found: clientes?.length || 0 });
    
    if (!clientes || clientes.length === 0) {
      return new Response(JSON.stringify({ error: 'CPF ou data de nascimento incorretos. Verifique os dados e tente novamente.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cliente = clientes[0];

    // Create session
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const { data: sessao, error: sessaoError } = await supabaseAdmin
      .from('sessoes_cliente')
      .insert({ cliente_id: cliente.id, expira_em: expiresAt })
      .select('token_sessao')
      .single();

    if (sessaoError) {
      console.error('Session error:', sessaoError);
      throw sessaoError;
    }

    return new Response(JSON.stringify({
      token_sessao: sessao.token_sessao,
      cliente_id: cliente.id,
      nome: cliente.nome_completo,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Auth error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
