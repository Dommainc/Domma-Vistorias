// Status de vistoria — tipos e configurações

export type StatusVistoria =
  | 'nao_liberada'
  | 'liberada'
  | 'agendada'
  | 'desmarcada'
  | 'aprovada'
  | 'reprovada'
  | 'com_pendencias'
  | 'cancelada'
  | 'distrato'

export interface StatusConfig {
  cor: string
  textoCor: string
  label: string
}

export const STATUS_CONFIG: Record<StatusVistoria, StatusConfig> = {
  nao_liberada:   { cor: '#9E9E9E', textoCor: '#fff', label: 'Não liberada' },
  liberada:       { cor: '#1565C0', textoCor: '#fff', label: 'Liberada' },
  agendada:       { cor: '#F59E0B', textoCor: '#fff', label: 'Agendada' },
  desmarcada:     { cor: '#78909C', textoCor: '#fff', label: 'Desmarcada' },
  aprovada:       { cor: '#2E7D32', textoCor: '#fff', label: 'Aprovada' },
  reprovada:      { cor: '#C62828', textoCor: '#fff', label: 'Reprovada' },
  com_pendencias: { cor: '#E65100', textoCor: '#fff', label: 'Com pendências' },
  cancelada:      { cor: '#455A64', textoCor: '#fff', label: 'Cancelada' },
  distrato:       { cor: '#6A1B9A', textoCor: '#fff', label: 'Distrato' },
}

export const STATUS_SELECIONAVEIS: StatusVistoria[] = [
  'nao_liberada',
  'liberada',
  'agendada',
  'desmarcada',
  'aprovada',
  'reprovada',
]

export const STATUS_ORDER: StatusVistoria[] = [
  'nao_liberada',
  'liberada',
  'agendada',
  'desmarcada',
  'aprovada',
  'reprovada',
  'com_pendencias',
  'cancelada',
  'distrato',
]

export function mapSupabaseStatus(status: string | null): StatusVistoria {
  const s = (status ?? '').toLowerCase()
  if (s === 'aguardando_liberacao' || s === 'aguardando liberacao') return 'nao_liberada'
  if (s === 'unidade_liberada' || s === 'unidade liberada') return 'liberada'
  if (STATUS_ORDER.includes(s as StatusVistoria)) return s as StatusVistoria
  return 'nao_liberada'
}

export function useStatusConfig() {
  return { STATUS_CONFIG, STATUS_ORDER, STATUS_SELECIONAVEIS }
}
