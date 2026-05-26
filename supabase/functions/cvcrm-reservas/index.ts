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

    const CVCRM_TOKEN = Deno.env.get('CVCRM_TOKEN') ?? ''
    const CVCRM_EMAIL = Deno.env.get('CVCRM_EMAIL') ?? ''
    const CVCRM_BASE_URL = Deno.env.get('CVCRM_BASE_URL') ?? 'https://domma.cvcrm.com.br/api/v1'

    const url = new URL(req.url)
    const page = url.searchParams.get('page') ?? '1'
    const empreendimentoId = url.searchParams.get('empreendimento_id')

    // /cvdw/ endpoints aceitam token via query string ou header
    let apiUrl = `${CVCRM_BASE_URL}/cvdw/reservas?page=${page}`
    if (empreendimentoId) apiUrl += `&empreendimento_id=${empreendimentoId}`

    // Tentar com email_token (mesmo padrão dos outros endpoints)
    const response = await fetch(apiUrl, {
      headers: {
        'email_token': CVCRM_TOKEN,
        'email': CVCRM_EMAIL,
        'token': CVCRM_TOKEN,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()

      // Se ainda 401, tentar via query string
      if (response.status === 401) {
        const urlComToken = `${apiUrl}&email=${encodeURIComponent(CVCRM_EMAIL)}&token=${encodeURIComponent(CVCRM_TOKEN)}`
        const response2 = await fetch(urlComToken, {
          headers: { 'Content-Type': 'application/json' },
        })

        if (response2.ok) {
          const data2 = await response2.json()
          return new Response(JSON.stringify(data2), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const text2 = await response2.text()
        return new Response(
          JSON.stringify({
            error: `Erro ao buscar reservas CVCRM: ${response2.status}`,
            detail: text2,
            hint: 'Verifique se CVCRM_EMAIL está configurado nas secrets do Supabase',
          }),
          { status: response2.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ error: `Erro ao buscar reservas CVCRM: ${response.status}`, detail: text }),
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
