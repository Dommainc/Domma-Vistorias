import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { mapSupabaseStatus } from '@/hooks/useStatusConfig'
import type { EmpreendimentoCVCRM, UnidadeCompleta, StatusVistoria, Bloco, ClienteReserva } from '@/types/cvcrm'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeKey = (s: string) =>
  s.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')

// ─── Normalizar unidade do formato PLANO ─────────────────────────────────────

function normalizarUnidadePlana(raw: any, blocoNome: string, faseNome: string): UnidadeCompleta {
  return {
    id:          raw.idunidade ?? raw.id ?? 0,
    codigo:      raw.unidade   ?? raw.numero ?? String(raw.idunidade ?? ''),
    tipo:        raw.tipo      ?? raw.tipo_unidade ?? '',
    metragem:    raw.area_privativa ?? raw.area ?? raw.metragem ?? 0,
    andar:       raw.andar     ?? 0,
    posicao:     raw.ordem     ?? 0,
    // status comercial vem DIRETAMENTE do CVCRM — fonte única de verdade
    status:      raw.situacao  ?? raw.disponibilidade ?? raw.status ?? '',
    id_pessoa:   raw.id_pessoa ?? raw.idcliente ?? null,
    id_proposta: raw.id_proposta ?? raw.idreserva ?? null,
    valor:       raw.valor     ?? raw.valor_venda ?? 0,
    statusVistoria: 'nao_liberada',
    blocoNome,
    faseNome,
  }
}

// ─── Montar estrutura de blocos a partir do array plano ──────────────────────

function montarBlocos(dados: any[]): Bloco[] {
  const etapaMap = new Map<string, Map<string, { idBloco: number; unidades: any[] }>>()

  for (const dado of dados) {
    const etapa  = dado.etapa  ?? dado.fase  ?? 'Fase 1'
    const bloco  = dado.bloco  ?? dado.torre ?? 'Bloco 1'
    const idBloco = dado.idbloco ?? 0

    if (!etapaMap.has(etapa)) etapaMap.set(etapa, new Map())
    const blocoMap = etapaMap.get(etapa)!
    if (!blocoMap.has(bloco)) blocoMap.set(bloco, { idBloco, unidades: [] })
    blocoMap.get(bloco)!.unidades.push(dado)
  }

  const blocos: Bloco[] = []
  for (const [etapa, blocoMap] of etapaMap) {
    for (const [bloco, { idBloco, unidades }] of blocoMap) {
      blocos.push({
        id:       idBloco,
        nome:     bloco,
        fase:     etapa,
        unidades: unidades.map(u => normalizarUnidadePlana(u, bloco, etapa)),
      })
    }
  }
  return blocos
}

// ─── Buscar mapa CVCRM (via cache da edge function) ──────────────────────────

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
  const dados: any[] = raw.dados ?? []

  const nomeEmpreendimento = dados[0]?.nome_empreendimento ?? ''
  const totalUnidades = raw.paginacao?.total_de_registros ?? dados.length
  const blocos = montarBlocos(dados)

  return { id: cvcrmId, nome: nomeEmpreendimento, totalUnidades, blocos }
}

// ─── Buscar status de vistoria do Supabase (apenas) ──────────────────────────

async function fetchStatusVistoria(
  empreendimentoId: string,
  blocos: Bloco[]
): Promise<{ statusMap: Record<string, StatusVistoria>; idMap: Record<string, string> }> {
  const { data: existing } = await supabase
    .from('unidades')
    .select('id, numero, bloco, status')
    .eq('empreendimento_id', empreendimentoId)

  const byKey = new Map<string, { id: string; status: string }>()
  for (const u of existing ?? []) {
    byKey.set(normalizeKey(u.numero), { id: u.id, status: u.status })
    if (u.bloco) byKey.set(normalizeKey(`${u.bloco}-${u.numero}`), { id: u.id, status: u.status })
  }

  // Inserir apenas unidades que ainda não existem (sem alterar status comercial)
  const toInsert: any[] = []
  for (const bloco of blocos) {
    for (const u of bloco.unidades) {
      const k1 = normalizeKey(u.codigo)
      const k2 = normalizeKey(`${bloco.nome}-${u.codigo}`)
      if (!byKey.has(k1) && !byKey.has(k2)) {
        toInsert.push({
          empreendimento_id:    empreendimentoId,
          numero:               u.codigo,
          bloco:                bloco.nome,
          andar:                u.andar ? String(u.andar) : null,
          tipo:                 u.tipo || null,
          status:               'nao_liberada',
          disponibilidade_ativa: false,
        })
      }
    }
  }

  if (toInsert.length > 0) {
    await supabase.from('unidades').insert(toInsert)
    const { data: newOnes } = await supabase
      .from('unidades')
      .select('id, numero, bloco, status')
      .eq('empreendimento_id', empreendimentoId)
      .in('numero', toInsert.map(u => u.numero))

    for (const u of newOnes ?? []) {
      byKey.set(normalizeKey(u.numero), { id: u.id, status: u.status })
      if (u.bloco) byKey.set(normalizeKey(`${u.bloco}-${u.numero}`), { id: u.id, status: u.status })
    }
  }

  const statusMap: Record<string, StatusVistoria> = {}
  const idMap: Record<string, string> = {}
  for (const [key, val] of byKey) {
    statusMap[key] = mapSupabaseStatus(val.status)
    idMap[key] = val.id
  }

  return { statusMap, idMap }
}

// ─── Buscar reservas CVCRM ───────────────────────────────────────────────────

async function fetchReservas(token: string): Promise<Map<number, ClienteReserva>> {
  const clienteMap = new Map<number, ClienteReserva>()
  try {
    let page = 1
    let temMais = true
    while (temMais) {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cvcrm-reservas?page=${page}`,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      )
      if (!res.ok) break
      const data = await res.json()
      const lista: any[] = Array.isArray(data)
        ? data
        : (data.dados ?? data.reservas ?? data.data ?? data.items ?? [])
      if (lista.length === 0) { temMais = false; break }

      for (const r of lista) {
        const idUnidade: number | null = r.idunidade ?? r.id_unidade ?? r.unidade_id ?? null
        if (!idUnidade) continue
        const situacao = (r.situacao ?? '').toLowerCase()
        if (situacao === 'cancelada') continue
        const cliente: ClienteReserva = {
          nome:          r.cliente        ?? r.nome_cliente ?? r.nome ?? '',
          cpf:           r.documento_cliente ?? r.cpf ?? undefined,
          email:         r.email          ?? undefined,
          telefone:      r.telefone       ?? undefined,
          celular:       r.celular        ?? undefined,
          id_pessoa:     r.idcliente      ?? r.id_pessoa ?? undefined,
          id_reserva:    r.idreserva      ?? r.id ?? undefined,
          status_reserva: r.situacao      ?? undefined,
          data_reserva:  r.data_cad       ?? r.data_reserva ?? undefined,
          valor:         r.valor_contrato ?? r.valor ?? undefined,
        }
        if (cliente.nome) clienteMap.set(idUnidade, cliente)
      }

      const totalPaginas = data.total_de_paginas ?? data.paginacao?.total_de_paginas ?? null
      if (totalPaginas && page >= totalPaginas) {
        temMais = false
      } else if (lista.length < 30) {
        temMais = false
      } else {
        page++
        if (page > 50) temMais = false
      }
    }
  } catch (err) {
    console.warn('[CVCRM] Falha ao buscar reservas:', err)
  }
  return clienteMap
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useMapaDisponibilidade(empreendimentoId: string, cvcrmId: number | null) {
  const queryClient = useQueryClient()
  const queryKey = ['mapa-disponibilidade', empreendimentoId, cvcrmId]

  // ── Realtime: escuta mudanças na tabela de cache do banco ─────────────────
  useEffect(() => {
    if (!cvcrmId || !empreendimentoId) return

    const channel = supabase
      .channel(`cache-mapa-${cvcrmId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cache_mapa_cvcrm',
          filter: `cvcrm_id=eq.${cvcrmId}`,
        },
        () => {
          // Invalida o cache do React Query → refetch automático
          queryClient.invalidateQueries({ queryKey })
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [cvcrmId, empreendimentoId, queryClient])

  return useQuery({
    queryKey,
    enabled: !!cvcrmId && !!empreendimentoId,
    staleTime: 25_000,          // considera stale após 25s (ligeiramente menor que o TTL do cache)
    gcTime:    1000 * 60 * 10,
    refetchInterval: 30_000,    // polling de segurança a cada 30s
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<EmpreendimentoCVCRM> => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Não autenticado')

      // 1. Mapa do CVCRM (via cache DB na edge function)
      const mapa = await fetchMapaCVCRM(cvcrmId!)

      // 2. Status de vistoria do Supabase
      const { statusMap, idMap } = await fetchStatusVistoria(empreendimentoId, mapa.blocos)

      // 3. Reservas (opcional)
      let clienteMap = new Map<number, ClienteReserva>()
      try { clienteMap = await fetchReservas(token) } catch { /* silencioso */ }

      // 4. Enriquecer unidades
      const blocosComStatus = mapa.blocos.map(bloco => ({
        ...bloco,
        unidades: bloco.unidades.map(unidade => {
          const k1 = normalizeKey(unidade.codigo)
          const k2 = normalizeKey(`${bloco.nome}-${unidade.codigo}`)
          const sv      = statusMap[k2] ?? statusMap[k1] ?? 'nao_liberada'
          const sid     = idMap[k2] ?? idMap[k1]
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
