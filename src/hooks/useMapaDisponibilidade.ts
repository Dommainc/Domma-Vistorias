import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { EmpreendimentoCVCRM, UnidadeCompleta, StatusVistoria } from '@/types/cvcrm'

async function fetchMapaCVCRM(cvcrmId: number): Promise<EmpreendimentoCVCRM> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Não autenticado')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cvcrm-mapa?id=${cvcrmId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Erro ${res.status}`)
  }

  const raw = await res.json()

  // Normalizar resposta do CVCRM para estrutura interna
  const blocos: EmpreendimentoCVCRM['blocos'] = []

  const fases = raw.fases ?? []
  for (const fase of fases) {
    for (const bloco of fase.blocos ?? []) {
      blocos.push({
        id: bloco.id,
        nome: bloco.nome,
        fase: fase.nome,
        unidades: (bloco.unidades ?? []).map((u: UnidadeCompleta) => ({
          ...u,
          statusVistoria: 'nao_liberada' as StatusVistoria,
        })),
      })
    }
  }

  return {
    id: raw.empreendimento?.id ?? cvcrmId,
    nome: raw.empreendimento?.nome ?? '',
    totalUnidades: raw.empreendimento?.total_unidades ?? 0,
    blocos,
  }
}

async function fetchStatusVistoria(empreendimentoId: string): Promise<Record<string, StatusVistoria>> {
  // Buscar unidades do empreendimento com seus clientes e agendamentos
  const { data: unidades } = await supabase
    .from('unidades')
    .select(`
      id,
      status,
      numero,
      bloco,
      clientes (
        id,
        agendamentos (
          status
        )
      )
    `)
    .eq('empreendimento_id', empreendimentoId)

  const mapa: Record<string, StatusVistoria> = {}

  for (const unidade of unidades ?? []) {
    // Mapear status do Supabase para StatusVistoria
    const statusSupa = unidade.status ?? 'aguardando_liberacao'
    const cliente = (unidade.clientes as { agendamentos?: { status: string }[] }[])?.[0]
    const agendamentos = cliente?.agendamentos ?? []
    const ultimoAgendamento = agendamentos[agendamentos.length - 1]

    let statusVistoria: StatusVistoria = 'nao_liberada'

    if (statusSupa === 'liberada') statusVistoria = 'liberada'
    else if (statusSupa === 'reprovada') statusVistoria = 'reprovada'
    else if (ultimoAgendamento) {
      const s = ultimoAgendamento.status
      if (s === 'vistoria_agendada' || s === 'aguardando_confirmacao') statusVistoria = 'agendada'
      else if (s === 'vistoria_concluida') statusVistoria = 'aprovada'
      else if (s === 'cancelado') statusVistoria = 'cancelada'
    }

    // Usar numero+bloco como chave para cruzar com CVCRM
    const chave = `${unidade.bloco ?? ''}-${unidade.numero}`.toLowerCase().replace(/\s/g, '')
    mapa[chave] = statusVistoria
    mapa[unidade.id] = statusVistoria
  }

  return mapa
}

export function useMapaDisponibilidade(empreendimentoId: string, cvcrmId: number | null) {
  return useQuery({
    queryKey: ['mapa-disponibilidade', empreendimentoId, cvcrmId],
    enabled: !!cvcrmId && !!empreendimentoId,
    queryFn: async (): Promise<EmpreendimentoCVCRM> => {
      const [mapa, statusVistoria] = await Promise.all([
        fetchMapaCVCRM(cvcrmId!),
        fetchStatusVistoria(empreendimentoId),
      ])

      // Merge: cruzar unidades CVCRM com status de vistoria do Supabase
      const blocosComStatus = mapa.blocos.map(bloco => ({
        ...bloco,
        unidades: bloco.unidades.map(unidade => {
          // Tentar casar pelo código da unidade (ex: "BL 01-101" → "bl01-101")
          const codigoNorm = unidade.codigo.toLowerCase().replace(/\s/g, '')
          const statusVist = statusVistoria[codigoNorm] ?? 'nao_liberada'
          return { ...unidade, statusVistoria: statusVist }
        }),
      }))

      return { ...mapa, blocos: blocosComStatus }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

export async function fetchPessoa(idPessoa: number) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Não autenticado')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cvcrm-pessoa?id=${idPessoa}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Erro ${res.status}`)
  }
  const raw = await res.json()
  return raw.pessoa ?? null
}
