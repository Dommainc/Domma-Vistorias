/**
 * Camada de serviço: Gestão de Liberação de Unidades para Vistoria
 *
 * Toda lógica de negócio (permissões, validações, alçadas) fica aqui.
 * Os componentes apenas chamam estas funções e exibem o resultado.
 */

import { supabase } from '@/integrations/supabase/client'

// ── Tipos ────────────────────────────────────────────────────────────────────

export type PerfilUsuario = 'vistoriador' | 'relacionamento' | 'admin'

export interface UnidadeConfig {
  id: string
  cvcrm_id_empreendimento: string
  cvcrm_id_unidade: number
  cvcrm_bloco?: string
  cvcrm_numero?: string
  agendarAPartirDe?: string         // ISO date 'YYYY-MM-DD'
  liberarParaAgendamento?: string   // ISO date 'YYYY-MM-DD'
  alcada1Liberada: boolean
  alcada1UserId?: string
  alcada1LiberadaEm?: string
  alcada2Liberada: boolean
  alcada2UserId?: string
  alcada2LiberadaEm?: string
}

export interface ResultadoAlcada {
  sucesso: boolean
  erro?: string
}

export interface AptoParaVistoria {
  apta: boolean
  motivo?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToConfig(row: any): UnidadeConfig {
  return {
    id:                       row.id,
    cvcrm_id_empreendimento:  row.cvcrm_id_empreendimento,
    cvcrm_id_unidade:         row.cvcrm_id_unidade,
    cvcrm_bloco:              row.cvcrm_bloco ?? undefined,
    cvcrm_numero:             row.cvcrm_numero ?? undefined,
    agendarAPartirDe:         row.agendar_a_partir_de ?? undefined,
    liberarParaAgendamento:   row.liberar_para_agendamento ?? undefined,
    alcada1Liberada:          row.alcada1_liberada,
    alcada1UserId:            row.alcada1_user_id ?? undefined,
    alcada1LiberadaEm:        row.alcada1_liberada_em ?? undefined,
    alcada2Liberada:          row.alcada2_liberada,
    alcada2UserId:            row.alcada2_user_id ?? undefined,
    alcada2LiberadaEm:        row.alcada2_liberada_em ?? undefined,
  }
}

async function registrarLogAlcada(params: {
  unidade_config_id: string
  cvcrm_id_empreendimento: string
  cvcrm_id_unidade: number
  user_id: string
  perfil_usuario: PerfilUsuario
  acao: string
  detalhe?: Record<string, unknown>
}): Promise<void> {
  const { error } = await supabase.from('unidade_config_log' as any).insert({
    unidade_config_id:       params.unidade_config_id,
    cvcrm_id_empreendimento: params.cvcrm_id_empreendimento,
    cvcrm_id_unidade:        params.cvcrm_id_unidade,
    user_id:                 params.user_id,
    perfil_usuario:          params.perfil_usuario,
    acao:                    params.acao,
    detalhe:                 params.detalhe ?? null,
  })
  if (error) {
    console.error('[unidadeConfigService] Erro ao registrar log:', error)
  }
}

// ── Funções públicas ──────────────────────────────────────────────────────────

/**
 * Busca a config de uma unidade; cria se não existir.
 * Salva snapshot de bloco/número para auditoria.
 */
export async function getOrCreateUnidadeConfig(
  cvcrm_id_empreendimento: string,
  cvcrm_id_unidade: number,
  snapshot: { bloco: string; numero: string },
): Promise<UnidadeConfig> {
  // Tenta buscar existente
  const { data: existing, error: fetchErr } = await supabase
    .from('unidade_config' as any)
    .select('*')
    .eq('cvcrm_id_empreendimento', cvcrm_id_empreendimento)
    .eq('cvcrm_id_unidade', cvcrm_id_unidade)
    .maybeSingle()

  if (fetchErr) throw fetchErr
  if (existing) return rowToConfig(existing)

  // Cria novo registro
  const { data: created, error: insErr } = await supabase
    .from('unidade_config' as any)
    .insert({
      cvcrm_id_empreendimento,
      cvcrm_id_unidade,
      cvcrm_bloco:  snapshot.bloco,
      cvcrm_numero: snapshot.numero,
    })
    .select('*')
    .single()

  if (insErr) throw insErr
  return rowToConfig(created)
}

/**
 * Busca configs de todas as unidades de um empreendimento.
 * Retorna Map keyed by cvcrm_id_unidade para lookup O(1).
 */
export async function getUnidadeConfigsMap(
  cvcrm_id_empreendimento: string,
): Promise<Map<number, UnidadeConfig>> {
  const { data, error } = await supabase
    .from('unidade_config' as any)
    .select('*')
    .eq('cvcrm_id_empreendimento', cvcrm_id_empreendimento)

  if (error) throw error
  const map = new Map<number, UnidadeConfig>()
  for (const row of data ?? []) {
    map.set(row.cvcrm_id_unidade, rowToConfig(row))
  }
  return map
}

/**
 * Salva datas de agendamento de uma unidade.
 * Cria a config se não existir.
 */
export async function salvarDatasAgendamento(
  cvcrm_id_empreendimento: string,
  cvcrm_id_unidade: number,
  datas: { agendarAPartirDe?: string; liberarParaAgendamento?: string },
  snapshot: { bloco: string; numero: string },
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const config = await getOrCreateUnidadeConfig(cvcrm_id_empreendimento, cvcrm_id_unidade, snapshot)

    const { error } = await supabase
      .from('unidade_config' as any)
      .update({
        agendar_a_partir_de:      datas.agendarAPartirDe    ?? null,
        liberar_para_agendamento: datas.liberarParaAgendamento ?? null,
      })
      .eq('id', config.id)

    if (error) throw error
    return { sucesso: true }
  } catch (e: any) {
    return { sucesso: false, erro: e?.message ?? 'Erro ao salvar datas' }
  }
}

/**
 * Libera a 1ª alçada (Vistoriador).
 * Valida: perfil = 'vistoriador' e alçada ainda não liberada.
 */
export async function liberarAlcada1(
  cvcrm_id_empreendimento: string,
  cvcrm_id_unidade: number,
  userId: string,
  perfil: PerfilUsuario,
  snapshot: { bloco: string; numero: string },
): Promise<ResultadoAlcada> {
  if (perfil !== 'vistoriador' && perfil !== 'admin') {
    return { sucesso: false, erro: 'Apenas o perfil Vistoriador pode liberar a 1ª alçada' }
  }

  try {
    const config = await getOrCreateUnidadeConfig(cvcrm_id_empreendimento, cvcrm_id_unidade, snapshot)

    if (config.alcada1Liberada) {
      return { sucesso: false, erro: '1ª alçada já foi liberada' }
    }

    const { error } = await supabase
      .from('unidade_config' as any)
      .update({
        alcada1_liberada:   true,
        alcada1_user_id:    userId,
        alcada1_liberada_em: new Date().toISOString(),
      })
      .eq('id', config.id)

    if (error) throw error

    await registrarLogAlcada({
      unidade_config_id:       config.id,
      cvcrm_id_empreendimento,
      cvcrm_id_unidade,
      user_id:                 userId,
      perfil_usuario:          perfil,
      acao:                    'alcada1_liberada',
    })

    return { sucesso: true }
  } catch (e: any) {
    return { sucesso: false, erro: e?.message ?? 'Erro ao liberar 1ª alçada' }
  }
}

/**
 * Libera a 2ª alçada (Relacionamento).
 * Valida: perfil = 'relacionamento', alçada 1 liberada e alçada 2 ainda não liberada.
 */
export async function liberarAlcada2(
  cvcrm_id_empreendimento: string,
  cvcrm_id_unidade: number,
  userId: string,
  perfil: PerfilUsuario,
  snapshot: { bloco: string; numero: string },
): Promise<ResultadoAlcada> {
  if (perfil !== 'relacionamento' && perfil !== 'admin') {
    return { sucesso: false, erro: 'Apenas o perfil Relacionamento pode liberar a 2ª alçada' }
  }

  try {
    const config = await getOrCreateUnidadeConfig(cvcrm_id_empreendimento, cvcrm_id_unidade, snapshot)

    if (!config.alcada1Liberada) {
      return { sucesso: false, erro: 'Esta unidade ainda não foi liberada pela 1ª alçada (Vistoriador)' }
    }
    if (config.alcada2Liberada) {
      return { sucesso: false, erro: '2ª alçada já foi liberada' }
    }

    const { error } = await supabase
      .from('unidade_config' as any)
      .update({
        alcada2_liberada:    true,
        alcada2_user_id:     userId,
        alcada2_liberada_em: new Date().toISOString(),
      })
      .eq('id', config.id)

    if (error) throw error

    await registrarLogAlcada({
      unidade_config_id:       config.id,
      cvcrm_id_empreendimento,
      cvcrm_id_unidade,
      user_id:                 userId,
      perfil_usuario:          perfil,
      acao:                    'alcada2_liberada',
    })

    return { sucesso: true }
  } catch (e: any) {
    return { sucesso: false, erro: e?.message ?? 'Erro ao liberar 2ª alçada' }
  }
}

/**
 * Reverte uma alçada (Admin apenas).
 * Motivo obrigatório — registrado no log.
 */
export async function reverterAlcada(
  cvcrm_id_empreendimento: string,
  cvcrm_id_unidade: number,
  alcada: 1 | 2,
  userId: string,
  perfil: PerfilUsuario,
  motivo: string,
  snapshot: { bloco: string; numero: string },
): Promise<ResultadoAlcada> {
  if (perfil !== 'admin') {
    return { sucesso: false, erro: 'Apenas o perfil Admin pode reverter alçadas' }
  }
  if (!motivo.trim()) {
    return { sucesso: false, erro: 'O motivo da reversão é obrigatório' }
  }

  try {
    const config = await getOrCreateUnidadeConfig(cvcrm_id_empreendimento, cvcrm_id_unidade, snapshot)

    let updatePayload: Record<string, any>
    let acao: string

    if (alcada === 1) {
      // Reverter alçada 1 implica reverter alçada 2 também
      updatePayload = {
        alcada1_liberada:    false,
        alcada1_user_id:     null,
        alcada1_liberada_em: null,
        alcada2_liberada:    false,
        alcada2_user_id:     null,
        alcada2_liberada_em: null,
      }
      acao = 'alcada1_revertida'
    } else {
      updatePayload = {
        alcada2_liberada:    false,
        alcada2_user_id:     null,
        alcada2_liberada_em: null,
      }
      acao = 'alcada2_revertida'
    }

    const { error } = await supabase
      .from('unidade_config' as any)
      .update(updatePayload)
      .eq('id', config.id)

    if (error) throw error

    await registrarLogAlcada({
      unidade_config_id:       config.id,
      cvcrm_id_empreendimento,
      cvcrm_id_unidade,
      user_id:                 userId,
      perfil_usuario:          perfil,
      acao,
      detalhe:                 { motivo },
    })

    return { sucesso: true }
  } catch (e: any) {
    return { sucesso: false, erro: e?.message ?? 'Erro ao reverter alçada' }
  }
}

/**
 * Verifica se uma unidade está apta para iniciar vistoria.
 * Critérios: situação CVCRM = 'vendida' E alçada 2 liberada.
 */
export async function verificarAptidaoVistoria(
  cvcrm_id_empreendimento: string,
  cvcrm_id_unidade: number,
  statusCvcrm: string, // 'vendida' | 'disponivel' | ... (valor normalizado de UnidadeStatus)
): Promise<AptoParaVistoria> {
  if (statusCvcrm !== 'vendida') {
    return { apta: false, motivo: 'Unidade não está com situação Vendida no CVCRM' }
  }

  try {
    const { data, error } = await supabase
      .from('unidade_config' as any)
      .select('alcada2_liberada')
      .eq('cvcrm_id_empreendimento', cvcrm_id_empreendimento)
      .eq('cvcrm_id_unidade', cvcrm_id_unidade)
      .maybeSingle()

    if (error) throw error

    if (!data || !data.alcada2_liberada) {
      return { apta: false, motivo: 'Unidade não foi liberada pela 2ª alçada (Relacionamento)' }
    }

    return { apta: true }
  } catch (e: any) {
    return { apta: false, motivo: 'Não foi possível verificar a liberação da unidade' }
  }
}

/**
 * Propaga configurações do empreendimento para unidades sem override individual.
 * Apenas atualiza linhas onde o campo específico é NULL.
 */
export async function propagarConfigEmpreendimento(
  cvcrm_id_empreendimento: string,
  config: { agendarAPartirDe?: string; liberarParaAgendamento?: string },
): Promise<{ atualizadas: number; erros: number }> {
  let atualizadas = 0
  let erros = 0

  try {
    if (config.agendarAPartirDe !== undefined) {
      const { data, error } = await supabase
        .from('unidade_config' as any)
        .update({ agendar_a_partir_de: config.agendarAPartirDe ?? null })
        .eq('cvcrm_id_empreendimento', cvcrm_id_empreendimento)
        .is('agendar_a_partir_de', null)
        .select('id')

      if (error) erros++
      else atualizadas += (data?.length ?? 0)
    }

    if (config.liberarParaAgendamento !== undefined) {
      const { data, error } = await supabase
        .from('unidade_config' as any)
        .update({ liberar_para_agendamento: config.liberarParaAgendamento ?? null })
        .eq('cvcrm_id_empreendimento', cvcrm_id_empreendimento)
        .is('liberar_para_agendamento', null)
        .select('id')

      if (error) erros++
      else atualizadas += (data?.length ?? 0)
    }
  } catch {
    erros++
  }

  return { atualizadas, erros }
}
