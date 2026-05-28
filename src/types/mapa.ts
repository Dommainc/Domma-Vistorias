export type UnidadeStatus =
  | 'disponivel'
  | 'reservada'
  | 'vendida'
  | 'bloqueada'
  | 'em_processo'
  | 'desconhecido';

export interface MapaUnidade {
  id?: string | number;
  unidade: string;
  bloco: string;
  fase: string;       // '' se não houver fase no CVCRM
  status: UnidadeStatus;
  area_total?: number;
  area_privativa?: number;
  area_comum?: number;
  fracao_ideal?: number;
  vagas?: number;
  tipo?: string;
  descricao?: string;
  raw?: any;
}

export interface MapaBloco {
  fase: string;       // '' se não houver fase
  bloco: string;
  unidades: MapaUnidade[];
}

export interface MapaEmpreendimento {
  id_empreendimento: string;
  nome: string;
  blocos: MapaBloco[];
  totais: Record<UnidadeStatus, number> & { total: number };
}

// Cores exatas do CVCRM
export const STATUS_BG: Record<UnidadeStatus, string> = {
  disponivel:  '#43A047',
  reservada:   '#FB8C00',
  vendida:     '#E53935',
  bloqueada:   '#9E9E9E',
  em_processo: '#1E88E5',
  desconhecido:'#78909C',
}

export const STATUS_LABEL: Record<UnidadeStatus, string> = {
  disponivel:  'Disponível',
  reservada:   'Reservada',
  vendida:     'Vendida',
  bloqueada:   'Bloqueada',
  em_processo: 'Em Processo',
  desconhecido:'Desconhecido',
}

// ── Status de vistoria (Supabase unidades.status)

export type VistoriaStatus =
  | 'nao_liberada'   // aguardando_liberacao ou não encontrada
  | 'liberada'       // unidade_liberada
  | 'agendada'       // vistoria_agendada
  | 'aprovada'       // vistoria_concluida
  | 'reprovada'      // vistoria_reprovada
  | 'cancelada'      // vistoria_cancelada

export const VISTORIA_STATUS_LABEL: Record<VistoriaStatus, string> = {
  nao_liberada: 'Não Liberada',
  liberada:     'Liberada',
  agendada:     'Agendada',
  aprovada:     'Aprovada',
  reprovada:    'Reprovada',
  cancelada:    'Cancelada',
}

/** Label curta usada em células pequenas do mapa (máx ~10 chars) */
export const VISTORIA_STATUS_LABEL_SHORT: Record<VistoriaStatus, string> = {
  nao_liberada: 'Não Lib.',
  liberada:     'Liberada',
  agendada:     'Agendada',
  aprovada:     'Aprovada',
  reprovada:    'Reprovada',
  cancelada:    'Cancelada',
}

export type VistoriaStatusMap = Map<string, VistoriaStatus>
