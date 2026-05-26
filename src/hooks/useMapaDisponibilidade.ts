import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { parseMapa, normBloco } from '@/lib/mapa-parser'
import type { MapaEmpreendimento, VistoriaStatus, VistoriaStatusMap } from '@/types/mapa'

export function useMapaDisponibilidade(idEmpreendimento: string | null) {
  return useQuery<MapaEmpreendimento>({
    queryKey: ['mapa-disponibilidade', idEmpreendimento],
    enabled: !!idEmpreendimento,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('cv-crm-mapa', {
        body: { idEmpreendimento },
      })
      if (error) throw error
      return parseMapa(data, idEmpreendimento!)
    },
  })
}

export interface UnidadeValorRow {
  bloco: string
  unidade: string
  valor_venda: number | null
  valor_avaliacao: number | null
  area_total: number | null
  area_privativa: number | null
  vagas: number | null
  tipo: string | null
}

export type ValoresMap = Record<string, UnidadeValorRow>

export function useUnidadeValores(idEmpreendimento: string | null) {
  return useQuery<ValoresMap>({
    queryKey: ['unidade-valores', idEmpreendimento],
    enabled: !!idEmpreendimento,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidade_valores' as any)
        .select('bloco, unidade, valor_venda, valor_avaliacao, area_total, area_privativa, vagas, tipo')
        .eq('id_empreendimento', idEmpreendimento!)
      if (error) throw error
      const map: ValoresMap = {}
      for (const row of (data ?? []) as any[]) {
        // Normalizar chave de bloco para garantir correspondência com dados do CVCRM
        const key = `${normBloco(row.bloco)}::${row.unidade}`
        map[key] = {
          bloco:           row.bloco,
          unidade:         row.unidade,
          valor_venda:     row.valor_venda     != null ? Number(row.valor_venda)     : null,
          valor_avaliacao: row.valor_avaliacao != null ? Number(row.valor_avaliacao) : null,
          area_total:      row.area_total      != null ? Number(row.area_total)      : null,
          area_privativa:  row.area_privativa  != null ? Number(row.area_privativa)  : null,
          vagas:           row.vagas           != null ? Number(row.vagas)           : null,
          tipo:            row.tipo            ?? null,
        }
      }
      return map
    },
  })
}

export interface EmpreendimentoMapaRow {
  id_empreendimento: string
  nome: string
  cidade: string | null
  estado: string | null
  ativo: boolean
}

export function useEmpreendimentos() {
  return useQuery<EmpreendimentoMapaRow[]>({
    queryKey: ['empreendimentos-mapa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empreendimentos_mapa' as any)
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return (data ?? []) as any
    },
  })
}

// ── Mapa de status de vistoria (Supabase unidades.status)

function mapVistoriaStatus(status: string | null): VistoriaStatus {
  switch (status) {
    case 'unidade_liberada':  return 'liberada'
    case 'vistoria_agendada': return 'agendada'
    case 'vistoria_concluida':return 'aprovada'
    case 'vistoria_reprovada':return 'reprovada'
    case 'vistoria_cancelada':return 'cancelada'
    default:                  return 'nao_liberada'
  }
}

export function useVistoriaStatusMap(empNome: string) {
  return useQuery<VistoriaStatusMap>({
    queryKey: ['vistoria-status-map', empNome],
    enabled: !!empNome,
    staleTime: 30_000,
    queryFn: async (): Promise<VistoriaStatusMap> => {
      if (!empNome) return new Map()

      // 1. Resolver UUID do empreendimento pelo nome (case-insensitive)
      const { data: emps } = await supabase
        .from('empreendimentos')
        .select('id')
        .ilike('nome', empNome.trim())
        .limit(1)

      if (!emps?.length) return new Map()
      const empId = emps[0].id

      // 2. Buscar unidades do empreendimento
      const { data: unidades } = await supabase
        .from('unidades')
        .select('bloco, numero, status')
        .eq('empreendimento_id', empId)

      // 3. Montar mapa: chave = normBloco(bloco)::numero
      const map: VistoriaStatusMap = new Map()
      for (const u of unidades ?? []) {
        const key = `${normBloco(u.bloco ?? '')}::${u.numero}`
        map.set(key, mapVistoriaStatus(u.status))
      }
      return map
    },
  })
}
