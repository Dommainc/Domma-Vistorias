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

export interface UnidadeCVCRM {
  id: number
  codigo: string
  tipo: string
  metragem: number
  andar: number
  posicao: number
  status: string
  id_pessoa: number | null
  id_proposta: number | null
  valor: number
}

export interface ClienteReserva {
  nome: string
  cpf?: string
  email?: string
  telefone?: string
  celular?: string
  id_pessoa?: number
  id_reserva?: number
  status_reserva?: string
  data_reserva?: string
  valor?: number
}

export interface UnidadeCompleta extends UnidadeCVCRM {
  statusVistoria: StatusVistoria
  supabaseUnidadeId?: string
  blocoNome?: string
  faseNome?: string
  dataUltimaAtualizacao?: string
  cliente?: ClienteReserva
}

export interface Bloco {
  id: number
  nome: string
  fase: string
  unidades: UnidadeCompleta[]
}

export interface EmpreendimentoCVCRM {
  id: number
  nome: string
  totalUnidades: number
  blocos: Bloco[]
}

export interface Pessoa {
  id: number
  nome: string
  cpf: string
  email: string
  telefone: string
  celular: string
  endereco?: {
    logradouro: string
    numero: string
    bairro: string
    cidade: string
    estado: string
    cep: string
  }
}

export interface StatusConfig {
  cor: string
  textoCor: string
  label: string
}
