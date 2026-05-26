import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { mapSupabaseStatus } from '@/hooks/useStatusConfig'
import type { EmpreendimentoCVCRM, UnidadeCompleta, StatusVistoria, Bloco, ClienteReserva } from '@/types/cvcrm'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeKey = (s: string) =>
  s.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')

function mapArea(raw: any): number {
  return raw.area_privativa ?? raw.area ?? raw.metragem ?? raw.area_total ?? raw.area_util ?? 0
}

/**
 * Determina o código de exibição da unidade exatamente como aparece no CVCRM.
 *
 * Casos observados:
 *   Seleto Inhaúma → codigo:5621  numero:"BL 01 -101"  → usa numero (tem letras)
 *   Outros         → codigo:4561  numero:"BL 01 -101"  → usa numero (tem letras)
 *   Unic Primavera → codigo:307   numero:1202           → usa numero (sem letras, mas é o apt)
 *   LIV Primavera  → codigo:534   numero:534            → usa numero (mesmo resultado)
 */
function resolverCodigo(raw: any): string {
  const rawCodigo = raw.codigo != null ? String(raw.codigo) : null
  const rawNumero = raw.numero != null ? String(raw.numero) : null

  // 1. "numero" com letras → é o código de exibição (ex: "BL 01 -102")
  if (rawNumero && /[a-zA-Z]/.test(rawNumero)) return rawNumero

  // 2. "codigo" com letras → é o código de exibição
  if (rawCodigo && /[a-zA-Z]/.test(rawCodigo)) return rawCodigo

  // 3. Nenhum tem letras → preferir "numero" (número do apartamento)
  //    ex: Unic Primavera: numero=1202 é mais correto que codigo=307
  if (rawNumero && rawNumero !== String(raw.id)) return rawNumero

  // 4. Fallback: "codigo" se for diferente do id
  if (rawCodigo && rawCodigo !== String(raw.id)) return rawCodigo

  // 5. Último recurso: id
  return String(raw.id ?? '')
}

function normalizarUnidade(raw: any, blocoNome: string, faseNome: string): UnidadeCompleta {
  return {
    id:          raw.id ?? 0,
    codigo:      resolverCodigo(raw),
    tipo:        raw.tipo ?? raw.tipo_unidade ?? '',
    metragem:    mapArea(raw),
    andar:       raw.andar ?? 0,
    posicao:     raw.posicao ?? raw.ordem ?? 0,
    status:      raw.disponibilidade ?? raw.status ?? raw.situacao ?? '',
    id_pessoa:   raw.id_pessoa ?? raw.cliente_id ?? null,
    id_proposta: raw.id_proposta ?? raw.proposta_id ?? null,
    valor:       raw.valor ?? raw.preco ?? raw.valor_venda ?? 0,
    statusVistoria: 'nao_liberada',
    blocoNome,
    faseNome,
  }
}

// ─── Buscar mapa CVCRM ────────────────────────────────────────────────────────

async function fetchMapaCVCRM(cvcrmId: number): Promise<EmpreendimentoCVCRM> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Não autenticado')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cvcrm-mapa?id=${cvcrmId}`,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Erro ${res.status}`)
  }

  const raw = await res.json()

  const blocos: Bloco[] = []
  for (const fase of raw.fases ?? []) {
    for (const bloco of fase.blocos ?? []) {
      blocos.push({
        id:       bloco.id,
        nome:     bloco.nome,
        fase:     fase.nome,
        unidades: (bloco.unidades ?? []).map((u: any) =>
          normalizarUnidade(u, bloco.nome, fase.nome)
        ),
      })
    }
  }

  return {
    id:            raw.empreendimento?.id ?? cvcrmId,
    nome:          raw.empreendimento?.nome ?? '',
    totalUnidades: raw.empreendimento?.total_unidades ?? 0,
    blocos,
  }
}

// ─── Buscar reservas CVCRM ───────────────────────────────────────────────────

async function fetchReservas(token: string): Promise<Map<number, ClienteReserva>> {
  const clienteMap = new Map<number, ClienteReserva>()

  try {
    console.log('[CVCRM RESERVAS] Iniciando busca...')
    let page = 1
    let temMais = true

    while (temMais) {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cvcrm-reservas?page=${page}`
      console.log('[CVCRM RESERVAS] Chamando:', url)

      const res = await fetch(url,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      )

      console.log('[CVCRM RESERVAS] Status HTTP:', res.status)

      if (!res.ok) {
        const txt = await res.text()
        console.error('[CVCRM RESERVAS] Erro na resposta:', res.status, txt)
        break
      }

      const data = await res.json()

      // 🔍 DEBUG — ver estrutura da resposta
      if (page === 1) {
        console.group('[CVCRM RESERVAS] Resposta página 1')
        console.log('Tipo:', Array.isArray(data) ? 'array' : typeof data)
        console.log('Chaves raiz:', Array.isArray(data) ? '(array)' : Object.keys(data).join(', '))
        console.log('Amostra (primeiros 2):', JSON.stringify(Array.isArray(data) ? data.slice(0, 2) : data, null, 2).slice(0, 2000))
        console.groupEnd()
      }

      // A API pode retornar array direto ou objeto com lista
      const lista: any[] = Array.isArray(data)
        ? data
        : (data.reservas ?? data.data ?? data.items ?? data.lista ?? [])

      if (lista.length === 0) {
        temMais = false
        break
      }

      for (const r of lista) {
        // Identificar o id da unidade (vários nomes possíveis)
        const idUnidade: number | null =
          r.id_unidade ?? r.unidade_id ?? r.unidade?.id ?? null

        if (!idUnidade) continue

        // Extrair dados do cliente / comprador
        const cliente: ClienteReserva = {
          nome:          r.nome_cliente ?? r.nome ?? r.cliente?.nome ?? r.comprador?.nome ?? '',
          cpf:           r.cpf ?? r.cliente?.cpf ?? r.comprador?.cpf ?? undefined,
          email:         r.email ?? r.cliente?.email ?? r.comprador?.email ?? undefined,
          telefone:      r.telefone ?? r.cliente?.telefone ?? r.comprador?.telefone ?? undefined,
          celular:       r.celular ?? r.cliente?.celular ?? r.comprador?.celular ?? undefined,
          id_pessoa:     r.id_pessoa ?? r.id_cliente ?? r.cliente?.id ?? undefined,
          id_reserva:    r.id ?? r.id_reserva ?? undefined,
          status_reserva: r.status ?? r.situacao ?? undefined,
          data_reserva:  r.data ?? r.data_reserva ?? r.created_at ?? undefined,
          valor:         r.valor ?? r.valor_venda ?? undefined,
        }

        // Só adiciona se tiver nome (unidade com cliente)
        if (cliente.nome) {
          clienteMap.set(idUnidade, cliente)
        }
      }

      // Verificar se tem próxima página
      const total = data.total ?? data.total_registros ?? null
      const porPagina = lista.length
      if (total !== null && page * porPagina >= total) {
        temMais = false
      } else if (lista.length < 50) {
        // Menos de 50 registros → provavelmente última página
        temMais = false
      } else {
        page++
        // Limite de segurança: máx 20 páginas
        if (page > 20) temMais = false
      }
    }
  } catch (err) {
    console.warn('[CVCRM] Falha ao buscar reservas:', err)
  }

  return clienteMap
}

// ─── Sincronizar CVCRM → Supabase + retornar status ──────────────────────────

async function syncAndFetchStatus(
  empreendimentoId: string,
  blocos: Bloco[]
): Promise<{ statusMap: Record<string, StatusVistoria>; idMap: Record<string, string> }> {

  // 1. Buscar unidades existentes no Supabase
  const { data: existing } = await supabase
    .from('unidades')
    .select('id, numero, bloco, status')
    .eq('empreendimento_id', empreendimentoId)

  // Mapas de lookup por chave normalizada
  const byKey = new Map<string, { id: string; status: string }>()
  for (const u of existing ?? []) {
    byKey.set(normalizeKey(u.numero), { id: u.id, status: u.status })
    if (u.bloco) {
      byKey.set(normalizeKey(`${u.bloco}-${u.numero}`), { id: u.id, status: u.status })
    }
  }

  // 2. Identificar unidades do CVCRM que não existem no Supabase
  const toInsert: any[] = []
  for (const bloco of blocos) {
    for (const u of bloco.unidades) {
      const k1 = normalizeKey(u.codigo)
      const k2 = normalizeKey(`${bloco.nome}-${u.codigo}`)
      if (!byKey.has(k1) && !byKey.has(k2)) {
        toInsert.push({
          empreendimento_id:   empreendimentoId,
          numero:              u.codigo,
          bloco:               bloco.nome,
          andar:               u.andar ? String(u.andar) : null,
          tipo:                u.tipo || null,
          status:              'nao_liberada',
          disponibilidade_ativa: false,
        })
      }
    }
  }

  // 3. Inserir novas unidades em lote
  if (toInsert.length > 0) {
    await supabase.from('unidades').insert(toInsert)

    const { data: newOnes } = await supabase
      .from('unidades')
      .select('id, numero, bloco, status')
      .eq('empreendimento_id', empreendimentoId)
      .in('numero', toInsert.map(u => u.numero))

    for (const u of newOnes ?? []) {
      byKey.set(normalizeKey(u.numero), { id: u.id, status: u.status })
      if (u.bloco) {
        byKey.set(normalizeKey(`${u.bloco}-${u.numero}`), { id: u.id, status: u.status })
      }
    }
  }

  // 4. Construir mapas de status e ID
  const statusMap: Record<string, StatusVistoria> = {}
  const idMap: Record<string, string> = {}

  for (const [key, val] of byKey) {
    statusMap[key] = mapSupabaseStatus(val.status)
    idMap[key] = val.id
  }

  return { statusMap, idMap }
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useMapaDisponibilidade(empreendimentoId: string, cvcrmId: number | null) {
  return useQuery({
    queryKey: ['mapa-disponibilidade', empreendimentoId, cvcrmId],
    enabled: !!cvcrmId && !!empreendimentoId,
    staleTime: 1000 * 60 * 2,
    queryFn: async (): Promise<EmpreendimentoCVCRM> => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Não autenticado')

      // 1. Buscar mapa CVCRM (obrigatório)
      const mapa = await fetchMapaCVCRM(cvcrmId!)

      // 2. Sincronizar com Supabase (obrigatório)
      const { statusMap, idMap } = await syncAndFetchStatus(empreendimentoId, mapa.blocos)

      // 3. Buscar reservas (opcional — nunca derruba o mapa se falhar)
      let clienteMap = new Map<number, ClienteReserva>()
      try {
        clienteMap = await fetchReservas(token)
      } catch {
        // silencioso — mapa carrega mesmo sem dados de reserva
      }

      // 4. Aplicar status do Supabase + cliente da reserva sobre cada unidade
      const blocosComStatus = mapa.blocos.map(bloco => ({
        ...bloco,
        unidades: bloco.unidades.map(unidade => {
          const k1 = normalizeKey(unidade.codigo)
          const k2 = normalizeKey(`${bloco.nome}-${unidade.codigo}`)
          const sv  = statusMap[k2] ?? statusMap[k1] ?? 'nao_liberada'
          const sid = idMap[k2] ?? idMap[k1]
          const cliente = clienteMap.get(unidade.id) ?? undefined
          return { ...unidade, statusVistoria: sv, supabaseUnidadeId: sid, cliente }
        }),
      }))

      return { ...mapa, blocos: blocosComStatus }
    },
  })
}

// ─── Fetch pessoa CVCRM ───────────────────────────────────────────────────────

export async function fetchPessoa(idPessoa: number) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Não autenticado')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cvcrm-pessoa?id=${idPessoa}`,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Erro ${res.status}`)
  }
  const data = await res.json()
  return data.pessoa ?? null
}
