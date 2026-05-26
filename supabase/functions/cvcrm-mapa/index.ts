import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CACHE_TTL_MS = 30_000 // 30 segundos

// ── Supabase admin client (service_role) para escrever no cache ──────────────
function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )
}

// ── Busca todas as páginas do CVCRM em paralelo ──────────────────────────────
async function fetchAllPages(
  base: string,
  headers: Record<string, string>
): Promise<{ paginacao: unknown; dados: unknown[] }> {
  const res1 = await fetch(`${base}?page=1`, { headers })
  if (!res1.ok) {
    const text = await res1.text()
    throw new Error(`CVCRM ${res1.status}: ${text.slice(0, 200)}`)
  }
  const page1 = await res1.json()

  if (page1.dados && Array.isArray(page1.dados)) {
    const totalPaginas: number = page1.paginacao?.total_de_paginas ?? 1
    let allDados = [...page1.dados]

    if (totalPaginas > 1) {
      const pageNums = Array.from({ length: totalPaginas - 1 }, (_, i) => i + 2)
      const responses = await Promise.all(
        pageNums.map(p => fetch(`${base}?page=${p}`, { headers }))
      )
      const bodies = await Promise.all(
        responses.map(r => r.ok ? r.json() : Promise.resolve({ dados: [] }))
      )
      for (const body of bodies) {
        if (body.dados && Array.isArray(body.dados)) {
          allDados = allDados.concat(body.dados)
        }
      }
    }
    return { paginacao: page1.paginacao, dados: allDados }
  }

  // Formato antigo nested
  return { paginacao: null, dados: Array.isArray(page1) ? page1 : [] }
}

// ── Atualiza o cache em background (não bloqueia a resposta) ─────────────────
async function refreshCache(cvcrmId: number): Promise<void> {
  try {
    const TOKEN    = Deno.env.get('CVCRM_TOKEN') ?? ''
    const EMAIL    = Deno.env.get('CVCRM_EMAIL') ?? ''
    const BASE_URL = Deno.env.get('CVCRM_BASE_URL') ?? 'https://domma.cvcrm.com.br/api/v1'

    const cvcrmHeaders = {
      'email_token': TOKEN,
      'email':       EMAIL,
      'token':       TOKEN,
      'Content-Type': 'application/json',
    }

    const base = `${BASE_URL}/comercial/mapadisponibilidade/${cvcrmId}`
    const result = await fetchAllPages(base, cvcrmHeaders)

    const admin = adminClient()
    await admin.from('cache_mapa_cvcrm').upsert({
      cvcrm_id:      cvcrmId,
      dados:         result.dados,
      paginacao:     result.paginacao,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'cvcrm_id' })
  } catch (err) {
    console.error('[cvcrm-mapa] refreshCache error:', err)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Params ──────────────────────────────────────────────────────────────
    const url = new URL(req.url)
    const idParam = url.searchParams.get('id')
    if (!idParam) {
      return new Response(JSON.stringify({ error: 'Parâmetro id é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const cvcrmId = parseInt(idParam, 10)

    // ── Ler cache do banco ───────────────────────────────────────────────────
    const admin = adminClient()
    const { data: cached } = await admin
      .from('cache_mapa_cvcrm')
      .select('dados, paginacao, atualizado_em')
      .eq('cvcrm_id', cvcrmId)
      .single()

    const agora = Date.now()
    const cacheAge = cached
      ? agora - new Date(cached.atualizado_em).getTime()
      : Infinity

    const cacheValido = cached && cacheAge < CACHE_TTL_MS

    if (cacheValido) {
      // ── HIT: retorna imediatamente ─────────────────────────────────────
      return new Response(
        JSON.stringify({ paginacao: cached.paginacao, dados: cached.dados }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
      )
    }

    if (cached) {
      // ── STALE: retorna o dado antigo AGORA e atualiza em background ────
      // Dispara o refresh sem await (não bloqueia)
      void refreshCache(cvcrmId)

      return new Response(
        JSON.stringify({ paginacao: cached.paginacao, dados: cached.dados }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'STALE' } }
      )
    }

    // ── MISS: primeira carga — busca do CVCRM e salva ────────────────────
    const TOKEN    = Deno.env.get('CVCRM_TOKEN') ?? ''
    const EMAIL    = Deno.env.get('CVCRM_EMAIL') ?? ''
    const BASE_URL = Deno.env.get('CVCRM_BASE_URL') ?? 'https://domma.cvcrm.com.br/api/v1'

    const cvcrmHeaders = {
      'email_token': TOKEN,
      'email':       EMAIL,
      'token':       TOKEN,
      'Content-Type': 'application/json',
    }

    const base = `${BASE_URL}/comercial/mapadisponibilidade/${cvcrmId}`
    const result = await fetchAllPages(base, cvcrmHeaders)

    // Salva no banco (em background para não atrasar a resposta)
    void admin.from('cache_mapa_cvcrm').upsert({
      cvcrm_id:      cvcrmId,
      dados:         result.dados,
      paginacao:     result.paginacao,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'cvcrm_id' })

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
    )

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
