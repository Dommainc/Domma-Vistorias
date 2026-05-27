import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:3000",
];

const ALLOWED_ORIGINS = Array.from(
  new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(Deno.env.get("ALLOWED_ORIGIN") ?? "")
      .split(",").map((o) => o.trim()).filter(Boolean),
  ])
);

function isAllowedOrigin(origin: string) {
  if (!origin || origin === "null") return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(origin: string) {
  const allowed = isAllowedOrigin(origin) ? (origin || "*") : "";
  return {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Origin": allowed,
  };
}

// Cache em memória por 120s
const cache = new Map<string, { at: number; data: unknown }>();
const TTL_MS = 120_000;

/** Normaliza situação para comparação */
function isVendida(situacao: string): boolean {
  return String(situacao ?? "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .includes("vend");
}

/** Busca todas as páginas de reservas em paralelo */
async function fetchAllReservas(baseUrl: string, email: string, token: string): Promise<any[]> {
  const hdrs = { email, token, accept: "application/json", "Content-Type": "application/json" };

  const res1 = await fetch(`${baseUrl}?pagina=1&por_pagina=100`, { headers: hdrs });
  if (!res1.ok) {
    const body = await res1.text();
    throw new Error(`CVCRM reservas API error: ${res1.status} — ${body.slice(0, 200)}`);
  }

  const page1 = await res1.json();
  const dados1: any[] = page1.dados ?? [];
  const totalPaginas: number = page1.total_de_paginas ?? 1;

  console.log(`[cv-crm-reservas] pagina 1/${totalPaginas} — ${dados1.length} reservas`);

  if (totalPaginas <= 1) return dados1;

  const pageNums = Array.from({ length: Math.min(totalPaginas - 1, 99) }, (_, i) => i + 2);
  const responses = await Promise.all(
    pageNums.map(p =>
      fetch(`${baseUrl}?pagina=${p}&por_pagina=100`, { headers: hdrs })
    )
  );
  const bodies = await Promise.all(
    responses.map(r => r.ok ? r.json() : Promise.resolve({ dados: [] }))
  );

  const all = [...dados1];
  for (const body of bodies) {
    if (body.dados && Array.isArray(body.dados)) all.push(...body.dados);
  }

  console.log(`[cv-crm-reservas] total: ${all.length} reservas`);
  return all;
}

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { idEmpreendimento } = await req.json();
    if (!idEmpreendimento || !/^[\w-]+$/.test(String(idEmpreendimento))) {
      return new Response(JSON.stringify({ error: "idEmpreendimento inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = String(idEmpreendimento);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) {
      return new Response(JSON.stringify(hit.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const EMAIL    = Deno.env.get("CVCRM_EMAIL")    ?? "";
    const TOKEN    = Deno.env.get("CVCRM_RESERVAS_TOKEN") ?? Deno.env.get("CVCRM_TOKEN") ?? "";
    const BASE_URL = Deno.env.get("CVCRM_BASE_URL") ?? Deno.env.get("CVCRM_DOMAIN") ?? "https://domma.cvcrm.com.br/api/v1";
    const domain   = BASE_URL.replace(/\/api\/v1\/?$/, "");
    const baseUrl  = `${domain}/api/v1/cvdw/reservas`;

    const empIdNum = parseInt(key, 10);
    const todasReservas = await fetchAllReservas(baseUrl, EMAIL, TOKEN);

    // Filtra por empreendimento + situação "vendida", deduplica por idunidade (última reserva vence)
    const mapaUnidade = new Map<number, any>();
    for (const r of todasReservas) {
      if (r.idempreendimento !== empIdNum) continue;
      if (!isVendida(r.situacao)) continue;
      mapaUnidade.set(r.idunidade, {
        idunidade:          r.idunidade,
        situacao:           r.situacao,
        cliente:            r.cliente,
        documento_cliente:  r.documento_cliente,
        email:              r.email,
        idade:              r.idade,
      });
    }

    const dados = Array.from(mapaUnidade.values());
    console.log(`[cv-crm-reservas] ${dados.length} unidades vendidas para emp ${key}`);

    const result = { dados };
    cache.set(key, { at: Date.now(), data: result });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (e: any) {
    console.error("[cv-crm-reservas] exception:", e?.message ?? e);
    return new Response(JSON.stringify({ error: e?.message ?? "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
