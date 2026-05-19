import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação Supabase
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extrair ID do empreendimento CVCRM da query string
    const url = new URL(req.url)
    const cvcrmId = url.searchParams.get('id')
    if (!cvcrmId) {
      return new Response(JSON.stringify({ error: 'Parâmetro id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const CVCRM_TOKEN = Deno.env.get('CVCRM_TOKEN')
    const CVCRM_BASE_URL = Deno.env.get('CVCRM_BASE_URL') ?? 'https://domma.cvcrm.com.br/api/v1'

    const response = await fetch(
      `${CVCRM_BASE_URL}/comercial/mapadisponibilidade/${cvcrmId}`,
      {
        headers: {
          'email_token': CVCRM_TOKEN!,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const text = await response.text()
      return new Response(
        JSON.stringify({ error: `Erro ao buscar mapa CVCRM: ${response.status}`, detail: text }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
