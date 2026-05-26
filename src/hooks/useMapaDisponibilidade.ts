import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { parseMapa } from '@/lib/mapa-parser'
import type { MapaEmpreendimento } from '@/types/mapa'

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
        map[`${row.bloco}::${row.unidade}`] = {
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
