export interface PermissionDef {
  key: string;
  modulo: string;
  tela: string;
  acao: string;
  descricao: string;
}

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: {
    key: 'DASHBOARD_VIEW',
    modulo: 'Dashboard',
    tela: 'Dashboard',
    acao: 'Visualizar',
    descricao: 'Visualizar o dashboard principal',
  },

  // Empreendimentos
  EMPREENDIMENTOS_VIEW: {
    key: 'EMPREENDIMENTOS_VIEW',
    modulo: 'Empreendimentos',
    tela: 'Empreendimentos',
    acao: 'Visualizar',
    descricao: 'Visualizar lista de empreendimentos',
  },
  EMPREENDIMENTOS_CREATE: {
    key: 'EMPREENDIMENTOS_CREATE',
    modulo: 'Empreendimentos',
    tela: 'Empreendimentos',
    acao: 'Criar',
    descricao: 'Criar novo empreendimento',
  },
  EMPREENDIMENTOS_EDIT: {
    key: 'EMPREENDIMENTOS_EDIT',
    modulo: 'Empreendimentos',
    tela: 'Empreendimentos',
    acao: 'Editar',
    descricao: 'Editar empreendimento existente',
  },
  EMPREENDIMENTOS_DELETE: {
    key: 'EMPREENDIMENTOS_DELETE',
    modulo: 'Empreendimentos',
    tela: 'Empreendimentos',
    acao: 'Excluir',
    descricao: 'Excluir empreendimento',
  },

  // Unidades
  UNIDADES_VIEW: {
    key: 'UNIDADES_VIEW',
    modulo: 'Unidades',
    tela: 'Unidades',
    acao: 'Visualizar',
    descricao: 'Visualizar lista de unidades',
  },
  UNIDADES_CREATE: {
    key: 'UNIDADES_CREATE',
    modulo: 'Unidades',
    tela: 'Unidades',
    acao: 'Criar',
    descricao: 'Criar nova unidade',
  },
  UNIDADES_EDIT: {
    key: 'UNIDADES_EDIT',
    modulo: 'Unidades',
    tela: 'Unidades',
    acao: 'Editar',
    descricao: 'Editar unidade existente',
  },
  UNIDADES_CHANGE_STATUS: {
    key: 'UNIDADES_CHANGE_STATUS',
    modulo: 'Unidades',
    tela: 'Unidades',
    acao: 'Alterar Status',
    descricao: 'Alterar status da unidade',
  },

  // Clientes
  CLIENTES_VIEW: {
    key: 'CLIENTES_VIEW',
    modulo: 'Clientes',
    tela: 'Clientes',
    acao: 'Visualizar',
    descricao: 'Visualizar lista de clientes',
  },
  CLIENTES_CREATE: {
    key: 'CLIENTES_CREATE',
    modulo: 'Clientes',
    tela: 'Clientes',
    acao: 'Criar',
    descricao: 'Criar novo cliente',
  },
  CLIENTES_EDIT: {
    key: 'CLIENTES_EDIT',
    modulo: 'Clientes',
    tela: 'Clientes',
    acao: 'Editar',
    descricao: 'Editar cliente existente',
  },
  CLIENTES_DELETE: {
    key: 'CLIENTES_DELETE',
    modulo: 'Clientes',
    tela: 'Clientes',
    acao: 'Excluir',
    descricao: 'Excluir cliente',
  },
  CLIENTES_SEND_LINK: {
    key: 'CLIENTES_SEND_LINK',
    modulo: 'Clientes',
    tela: 'Clientes',
    acao: 'Enviar Link',
    descricao: 'Enviar link de agendamento ao cliente',
  },

  // Agendamentos
  AGENDAMENTOS_VIEW: {
    key: 'AGENDAMENTOS_VIEW',
    modulo: 'Agendamentos',
    tela: 'Agendamentos',
    acao: 'Visualizar',
    descricao: 'Visualizar lista de agendamentos',
  },
  AGENDAMENTOS_CREATE: {
    key: 'AGENDAMENTOS_CREATE',
    modulo: 'Agendamentos',
    tela: 'Agendamentos',
    acao: 'Criar',
    descricao: 'Criar novo agendamento',
  },
  AGENDAMENTOS_EDIT: {
    key: 'AGENDAMENTOS_EDIT',
    modulo: 'Agendamentos',
    tela: 'Agendamentos',
    acao: 'Editar',
    descricao: 'Editar agendamento existente',
  },
  AGENDAMENTOS_CANCEL: {
    key: 'AGENDAMENTOS_CANCEL',
    modulo: 'Agendamentos',
    tela: 'Agendamentos',
    acao: 'Cancelar',
    descricao: 'Cancelar agendamento',
  },
  AGENDAMENTOS_CHANGE_STATUS: {
    key: 'AGENDAMENTOS_CHANGE_STATUS',
    modulo: 'Agendamentos',
    tela: 'Agendamentos',
    acao: 'Alterar Status',
    descricao: 'Alterar status do agendamento',
  },

  // Mapa de Disponibilidade
  MAPA_VIEW: {
    key: 'MAPA_VIEW',
    modulo: 'Mapa',
    tela: 'Mapa de Disponibilidade',
    acao: 'Visualizar',
    descricao: 'Visualizar mapa de disponibilidade',
  },

  // Configurações > Agendamentos
  CONFIG_AGENDAMENTOS_VIEW: {
    key: 'CONFIG_AGENDAMENTOS_VIEW',
    modulo: 'Configurações',
    tela: 'Configurações de Agendamentos',
    acao: 'Visualizar',
    descricao: 'Visualizar configurações de agendamentos',
  },
  CONFIG_AGENDAMENTOS_EDIT: {
    key: 'CONFIG_AGENDAMENTOS_EDIT',
    modulo: 'Configurações',
    tela: 'Configurações de Agendamentos',
    acao: 'Editar',
    descricao: 'Editar configurações de agendamentos',
  },

  // Configurações > Usuários
  CONFIG_USERS_VIEW: {
    key: 'CONFIG_USERS_VIEW',
    modulo: 'Configurações',
    tela: 'Usuários',
    acao: 'Visualizar',
    descricao: 'Visualizar lista de usuários',
  },
  CONFIG_USERS_CREATE: {
    key: 'CONFIG_USERS_CREATE',
    modulo: 'Configurações',
    tela: 'Usuários',
    acao: 'Criar',
    descricao: 'Criar novo usuário no sistema',
  },
  CONFIG_USERS_EDIT: {
    key: 'CONFIG_USERS_EDIT',
    modulo: 'Configurações',
    tela: 'Usuários',
    acao: 'Editar',
    descricao: 'Editar usuário existente',
  },
  CONFIG_USERS_TOGGLE_STATUS: {
    key: 'CONFIG_USERS_TOGGLE_STATUS',
    modulo: 'Configurações',
    tela: 'Usuários',
    acao: 'Ativar/Desativar',
    descricao: 'Ativar ou desativar usuário',
  },
  CONFIG_USERS_RESET_PASSWORD: {
    key: 'CONFIG_USERS_RESET_PASSWORD',
    modulo: 'Configurações',
    tela: 'Usuários',
    acao: 'Redefinir Senha',
    descricao: 'Redefinir senha de usuário',
  },

  // Configurações > Perfis
  CONFIG_PERFIS_VIEW: {
    key: 'CONFIG_PERFIS_VIEW',
    modulo: 'Configurações',
    tela: 'Perfis',
    acao: 'Visualizar',
    descricao: 'Visualizar lista de perfis',
  },
  CONFIG_PERFIS_CREATE: {
    key: 'CONFIG_PERFIS_CREATE',
    modulo: 'Configurações',
    tela: 'Perfis',
    acao: 'Criar',
    descricao: 'Criar novo perfil',
  },
  CONFIG_PERFIS_EDIT: {
    key: 'CONFIG_PERFIS_EDIT',
    modulo: 'Configurações',
    tela: 'Perfis',
    acao: 'Editar',
    descricao: 'Editar perfil existente',
  },
  CONFIG_PERFIS_TOGGLE_STATUS: {
    key: 'CONFIG_PERFIS_TOGGLE_STATUS',
    modulo: 'Configurações',
    tela: 'Perfis',
    acao: 'Ativar/Desativar',
    descricao: 'Ativar ou desativar perfil',
  },
  CONFIG_PERFIS_MANAGE_PERMISSIONS: {
    key: 'CONFIG_PERFIS_MANAGE_PERMISSIONS',
    modulo: 'Configurações',
    tela: 'Perfis',
    acao: 'Gerenciar Permissões',
    descricao: 'Gerenciar permissões de um perfil',
  },
} as const satisfies Record<string, PermissionDef>;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/** Permissões que o perfil Admin sempre possui — independente do banco */
export const ADMIN_PERMISSIONS: PermissionKey[] = Object.keys(PERMISSIONS) as PermissionKey[];
