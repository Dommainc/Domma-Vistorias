import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { cpfs } = await req.json();
    if (!Array.isArray(cpfs) || cpfs.length === 0) {
      return new Response(JSON.stringify({ error: 'cpfs inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const EMAIL    = Deno.env.get('CVCRM_EMAIL') ?? '';
    const TOKEN    = Deno.env.get('CVCRM_TOKEN') ?? '';
    const BASE_URL = Deno.env.get('CVCRM_BASE_URL') ?? 'https://domma.cvcrm.com.br/api/v1';
    const domain   = BASE_URL.replace(/\/api\/v1\/?$/, '');

    const results: { cpf: string; telefone: string | null }[] = [];

    // Testa um CPF antes de processar todos
    const cpfTeste = cpfs[0];
    // Testa múltiplos endpoints para achar o correto
    const endpoints = [
      `${domain}/api/v1/cvdw/clientes?pagina=1&por_pagina=1`,
      `${domain}/api/v1/comercial/clientes?documento=${cpfTeste}`,
      `${domain}/api/v1/clientes?documento=${cpfTeste}`,
    ];
    for (const urlTeste of endpoints) {
      const rTeste = await fetch(urlTeste, {
        headers: { email: EMAIL, token: TOKEN, accept: 'application/json' },
      });
      const rawT = await rTeste.text();
      console.log(`[sync-phones] ENDPOINT: ${urlTeste} → ${rTeste.status} → ${rawT.slice(0, 300)}`);
    }
    const urlTeste = endpoints[0]; // placeholder para não quebrar o código abaixo
    const resTeste = await fetch(urlTeste, {
      headers: { email: EMAIL, token: TOKEN, accept: 'application/json' },
    });
    const rawTeste = await resTeste.text();
    console.log(`[sync-phones] TESTE CPF: ${cpfTeste}`);
    console.log(`[sync-phones] STATUS: ${resTeste.status}`);
    console.log(`[sync-phones] RESPOSTA: ${rawTeste.slice(0, 800)}`);

    const BATCH = 20;
    for (let i = 0; i < cpfs.length; i += BATCH) {
      const batch = cpfs.slice(i, i + BATCH);

      const batchResults = await Promise.all(batch.map(async (cpf: string) => {
        try {
          const res = await fetch(`${domain}/api/v1/cliente`, {
            method: 'POST',
            headers: { email: EMAIL, token: TOKEN, accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ documento: cpf }),
          });
          if (!res.ok) return { cpf, telefone: null };

          const data = await res.json();
          const cliente = Array.isArray(data) ? data[0] : (data.dados?.[0] ?? data);
          const tel = cliente?.celular ?? cliente?.telefone ?? cliente?.telefone_1 ?? cliente?.fone ?? null;
          return { cpf, telefone: tel ? String(tel).replace(/\D/g, '') : null };
        } catch {
          return { cpf, telefone: null };
        }
      }));

      results.push(...batchResults);
      if (i + BATCH < cpfs.length) await new Promise(r => setTimeout(r, 350));
    }

    console.log(`[cv-crm-sync-phones] ${results.filter(r => r.telefone).length}/${results.length} com telefone`);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
