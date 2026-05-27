/**
 * Hook: useUnidadeConfig
 * Busca, observa em realtime e expõe funções de alçada para uma unidade específica.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import {
  type UnidadeConfig,
  type ResultadoAlcada,
  type AptoParaVistoria,
  type PerfilUsuario,
  getOrCreateUnidadeConfig,
  liberarAlcada1,
  liberarAlcada2,
  reverterAlcada,
  salvarDatasAgendamento,
  verificarAptidaoVistoria,
} from '@/services/unidadeConfigService'

export type { UnidadeConfig, ResultadoAlcada, AptoParaVistoria, PerfilUsuario }

interface UseUnidadeConfigReturn {
  config: UnidadeConfig | null
  loading: boolean
  erro: string | null
  refetch: () => Promise<void>
  liberarAlcada1: () => Promise<ResultadoAlcada>
  liberarAlcada2: () => Promise<ResultadoAlcada>
  reverterAlcada: (alcada: 1 | 2, motivo: string) => Promise<ResultadoAlcada>
  salvarDatas: (datas: { agendarAPartirDe?: string; liberarParaAgendamento?: string }) => Promise<ResultadoAlcada>
  aptaParaVistoria: (statusCvcrm: string) => Promise<AptoParaVistoria>
}

export function useUnidadeConfig(
  cvcrm_id_empreendimento: string | null,
  cvcrm_id_unidade: number | null,
  snapshot?: { bloco: string; numero: string },
): UseUnidadeConfigReturn {
  const { profile, user } = useAuth()
  const [config, setConfig] = useState<UnidadeConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const perfil = (profile?.perfil ?? 'vistoriador') as PerfilUsuario
  const snap = snapshot ?? { bloco: '', numero: '' }

  const fetch = useCallback(async () => {
    if (!cvcrm_id_empreendimento || cvcrm_id_unidade == null) return
    setLoading(true)
    setErro(null)
    try {
      // Usa getOrCreate para garantir que a linha existe
      const data = await getOrCreateUnidadeConfig(
        cvcrm_id_empreendimento,
        cvcrm_id_unidade,
        snap,
      )
      setConfig(data)
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao buscar configuração')
    } finally {
      setLoading(false)
    }
  }, [cvcrm_id_empreendimento, cvcrm_id_unidade]) // eslint-disable-line react-hooks/exhaustive-deps

  // Busca inicial
  useEffect(() => {
    fetch()
  }, [fetch])

  // Realtime: atualiza quando outro usuário altera a config
  useEffect(() => {
    if (!cvcrm_id_empreendimento || cvcrm_id_unidade == null) return

    const channel = supabase
      .channel(`unidade_config:${cvcrm_id_empreendimento}:${cvcrm_id_unidade}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unidade_config',
          filter: `cvcrm_id_empreendimento=eq.${cvcrm_id_empreendimento}`,
        },
        (payload) => {
          const row = payload.new as any
          if (row && row.cvcrm_id_unidade === cvcrm_id_unidade) {
            fetch()
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [cvcrm_id_empreendimento, cvcrm_id_unidade, fetch])

  const handleLiberarAlcada1 = useCallback(async (): Promise<ResultadoAlcada> => {
    if (!cvcrm_id_empreendimento || cvcrm_id_unidade == null || !user) {
      return { sucesso: false, erro: 'Dados insuficientes para liberar alçada' }
    }
    const result = await liberarAlcada1(
      cvcrm_id_empreendimento, cvcrm_id_unidade, user.id, perfil, snap,
    )
    if (result.sucesso) await fetch()
    return result
  }, [cvcrm_id_empreendimento, cvcrm_id_unidade, user, perfil, fetch]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLiberarAlcada2 = useCallback(async (): Promise<ResultadoAlcada> => {
    if (!cvcrm_id_empreendimento || cvcrm_id_unidade == null || !user) {
      return { sucesso: false, erro: 'Dados insuficientes para liberar alçada' }
    }
    const result = await liberarAlcada2(
      cvcrm_id_empreendimento, cvcrm_id_unidade, user.id, perfil, snap,
    )
    if (result.sucesso) await fetch()
    return result
  }, [cvcrm_id_empreendimento, cvcrm_id_unidade, user, perfil, fetch]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReverterAlcada = useCallback(async (alcada: 1 | 2, motivo: string): Promise<ResultadoAlcada> => {
    if (!cvcrm_id_empreendimento || cvcrm_id_unidade == null || !user) {
      return { sucesso: false, erro: 'Dados insuficientes para reverter alçada' }
    }
    const result = await reverterAlcada(
      cvcrm_id_empreendimento, cvcrm_id_unidade, alcada, user.id, perfil, motivo, snap,
    )
    if (result.sucesso) await fetch()
    return result
  }, [cvcrm_id_empreendimento, cvcrm_id_unidade, user, perfil, fetch]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSalvarDatas = useCallback(async (
    datas: { agendarAPartirDe?: string; liberarParaAgendamento?: string },
  ): Promise<ResultadoAlcada> => {
    if (!cvcrm_id_empreendimento || cvcrm_id_unidade == null) {
      return { sucesso: false, erro: 'Dados insuficientes' }
    }
    const result = await salvarDatasAgendamento(
      cvcrm_id_empreendimento, cvcrm_id_unidade, datas, snap,
    )
    if (result.sucesso) await fetch()
    return result
  }, [cvcrm_id_empreendimento, cvcrm_id_unidade, fetch]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAptaParaVistoria = useCallback(async (statusCvcrm: string): Promise<AptoParaVistoria> => {
    if (!cvcrm_id_empreendimento || cvcrm_id_unidade == null) {
      return { apta: false, motivo: 'Configuração não encontrada' }
    }
    return verificarAptidaoVistoria(cvcrm_id_empreendimento, cvcrm_id_unidade, statusCvcrm)
  }, [cvcrm_id_empreendimento, cvcrm_id_unidade])

  return {
    config,
    loading,
    erro,
    refetch: fetch,
    liberarAlcada1: handleLiberarAlcada1,
    liberarAlcada2: handleLiberarAlcada2,
    reverterAlcada: handleReverterAlcada,
    salvarDatas: handleSalvarDatas,
    aptaParaVistoria: handleAptaParaVistoria,
  }
}

// ── Hook para mapas: busca configs de todas as unidades de um empreendimento

import { useQuery } from '@tanstack/react-query'
import { getUnidadeConfigsMap } from '@/services/unidadeConfigService'

export function useUnidadeConfigsMap(cvcrm_id_empreendimento: string | null) {
  return useQuery<Map<number, UnidadeConfig>>({
    queryKey: ['unidade-configs-map', cvcrm_id_empreendimento],
    enabled:  !!cvcrm_id_empreendimento,
    staleTime: 30_000,
    queryFn:  () => getUnidadeConfigsMap(cvcrm_id_empreendimento!),
  })
}
