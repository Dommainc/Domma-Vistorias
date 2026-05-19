export type UserProfile = 'admin' | 'vistoriador';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  perfil: UserProfile;
  ativo: boolean;
  criado_em: string;
}

export interface Empreendimento {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  descricao?: string;
  foto_url?: string;
  ativo: boolean;
  aceita_agendamento: boolean;
  criado_em: string;
}

export interface Unidade {
  id: string;
  empreendimento_id: string;
  bloco?: string;
  andar?: string;
  numero: string;
  tipo?: string;
  status: 'apta' | 'bloqueada' | 'vistoriada';
  aceita_agendamento: boolean;
  criado_em: string;
}

export interface Cliente {
  id: string;
  unidade_id: string;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  email: string;
  telefone?: string;
  token_agendamento: string;
  token_expira_em?: string;
  token_usado: boolean;
  criado_por?: string;
  criado_em: string;
}

export interface Documento {
  id: string;
  cliente_id: string;
  nome_arquivo: string;
  tipo_documento?: string;
  arquivo_url: string;
  tamanho_bytes?: number;
  enviado_por?: string;
  criado_em: string;
}

export interface Disponibilidade {
  id: string;
  empreendimento_id?: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  intervalo_minutos: number;
  vagas_por_horario: number;
  ativo: boolean;
}

export type AgendamentoStatus = 'pendente' | 'confirmado' | 'realizado' | 'cancelado' | 'reagendado';

export interface Agendamento {
  id: string;
  cliente_id: string;
  unidade_id: string;
  data_hora: string;
  status: AgendamentoStatus;
  observacoes?: string;
  confirmado_em?: string;
  realizado_em?: string;
  cancelado_em?: string;
  motivo_cancelamento?: string;
  criado_em: string;
  atualizado_em: string;
}
