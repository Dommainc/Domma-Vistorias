import type { StatusVistoria, StatusConfig } from '@/types/cvcrm'

export const STATUS_CONFIG: Record<StatusVistoria, StatusConfig> = {
  nao_liberada:   { cor: '#9E9E9E', textoCor: '#fff', label: 'Não liberada' },
  liberada:       { cor: '#4CAF50', textoCor: '#fff', label: 'Liberada' },
  agendada:       { cor: '#FF9800', textoCor: '#fff', label: 'Agendada' },
  reprovada:      { cor: '#F44336', textoCor: '#fff', label: 'Reprovada' },
  aprovada:       { cor: '#2E7D32', textoCor: '#fff', label: 'Aprovada' },
  com_pendencias: { cor: '#FFC107', textoCor: '#000', label: 'Com pendências' },
  cancelada:      { cor: '#607D8B', textoCor: '#fff', label: 'Cancelada' },
  distrato:       { cor: '#B71C1C', textoCor: '#fff', label: 'Distrato' },
}

export const STATUS_ORDER: StatusVistoria[] = [
  'nao_liberada',
  'liberada',
  'agendada',
  'reprovada',
  'aprovada',
  'com_pendencias',
  'cancelada',
  'distrato',
]

export function useStatusConfig() {
  return { STATUS_CONFIG, STATUS_ORDER }
}
