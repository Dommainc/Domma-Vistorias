-- FASE 2: Seed de Permissões
-- Migration: 20260527130000_permissions_seed.sql
-- Popula a tabela permissions com todas as permissões do sistema
-- e vincula Admin a todas as permissões automaticamente.
-- SEGURO: apenas INSERTs com ON CONFLICT DO NOTHING — não altera dados existentes.

-- ============================================================
-- 1. INSERIR PERMISSÕES
-- ============================================================

INSERT INTO public.permissions (permission_key, modulo, tela, acao, descricao) VALUES
  -- Dashboard
  ('DASHBOARD_VIEW', 'Dashboard', 'Dashboard', 'Visualizar', 'Visualizar o dashboard principal'),

  -- Empreendimentos
  ('EMPREENDIMENTOS_VIEW',   'Empreendimentos', 'Empreendimentos', 'Visualizar',   'Visualizar lista de empreendimentos'),
  ('EMPREENDIMENTOS_CREATE', 'Empreendimentos', 'Empreendimentos', 'Criar',        'Criar novo empreendimento'),
  ('EMPREENDIMENTOS_EDIT',   'Empreendimentos', 'Empreendimentos', 'Editar',       'Editar empreendimento existente'),
  ('EMPREENDIMENTOS_DELETE', 'Empreendimentos', 'Empreendimentos', 'Excluir',      'Excluir empreendimento'),

  -- Unidades
  ('UNIDADES_VIEW',          'Unidades', 'Unidades', 'Visualizar',    'Visualizar lista de unidades'),
  ('UNIDADES_CREATE',        'Unidades', 'Unidades', 'Criar',         'Criar nova unidade'),
  ('UNIDADES_EDIT',          'Unidades', 'Unidades', 'Editar',        'Editar unidade existente'),
  ('UNIDADES_CHANGE_STATUS', 'Unidades', 'Unidades', 'Alterar Status','Alterar status da unidade'),

  -- Clientes
  ('CLIENTES_VIEW',      'Clientes', 'Clientes', 'Visualizar',  'Visualizar lista de clientes'),
  ('CLIENTES_CREATE',    'Clientes', 'Clientes', 'Criar',       'Criar novo cliente'),
  ('CLIENTES_EDIT',      'Clientes', 'Clientes', 'Editar',      'Editar cliente existente'),
  ('CLIENTES_DELETE',    'Clientes', 'Clientes', 'Excluir',     'Excluir cliente'),
  ('CLIENTES_SEND_LINK', 'Clientes', 'Clientes', 'Enviar Link', 'Enviar link de agendamento ao cliente'),

  -- Agendamentos
  ('AGENDAMENTOS_VIEW',          'Agendamentos', 'Agendamentos', 'Visualizar',    'Visualizar lista de agendamentos'),
  ('AGENDAMENTOS_CREATE',        'Agendamentos', 'Agendamentos', 'Criar',         'Criar novo agendamento'),
  ('AGENDAMENTOS_EDIT',          'Agendamentos', 'Agendamentos', 'Editar',        'Editar agendamento existente'),
  ('AGENDAMENTOS_CANCEL',        'Agendamentos', 'Agendamentos', 'Cancelar',      'Cancelar agendamento'),
  ('AGENDAMENTOS_CHANGE_STATUS', 'Agendamentos', 'Agendamentos', 'Alterar Status','Alterar status do agendamento'),

  -- Mapa
  ('MAPA_VIEW', 'Mapa', 'Mapa de Disponibilidade', 'Visualizar', 'Visualizar mapa de disponibilidade'),

  -- Configurações > Agendamentos
  ('CONFIG_AGENDAMENTOS_VIEW', 'Configurações', 'Configurações de Agendamentos', 'Visualizar', 'Visualizar configurações de agendamentos'),
  ('CONFIG_AGENDAMENTOS_EDIT', 'Configurações', 'Configurações de Agendamentos', 'Editar',     'Editar configurações de agendamentos'),

  -- Configurações > Usuários
  ('CONFIG_USERS_VIEW',           'Configurações', 'Usuários', 'Visualizar',      'Visualizar lista de usuários'),
  ('CONFIG_USERS_CREATE',         'Configurações', 'Usuários', 'Criar',           'Criar novo usuário no sistema'),
  ('CONFIG_USERS_EDIT',           'Configurações', 'Usuários', 'Editar',          'Editar usuário existente'),
  ('CONFIG_USERS_TOGGLE_STATUS',  'Configurações', 'Usuários', 'Ativar/Desativar','Ativar ou desativar usuário'),
  ('CONFIG_USERS_RESET_PASSWORD', 'Configurações', 'Usuários', 'Redefinir Senha', 'Redefinir senha de usuário'),

  -- Configurações > Perfis
  ('CONFIG_PERFIS_VIEW',               'Configurações', 'Perfis', 'Visualizar',         'Visualizar lista de perfis'),
  ('CONFIG_PERFIS_CREATE',             'Configurações', 'Perfis', 'Criar',              'Criar novo perfil'),
  ('CONFIG_PERFIS_EDIT',               'Configurações', 'Perfis', 'Editar',             'Editar perfil existente'),
  ('CONFIG_PERFIS_TOGGLE_STATUS',      'Configurações', 'Perfis', 'Ativar/Desativar',   'Ativar ou desativar perfil'),
  ('CONFIG_PERFIS_MANAGE_PERMISSIONS', 'Configurações', 'Perfis', 'Gerenciar Permissões','Gerenciar permissões de um perfil')

ON CONFLICT (permission_key) DO UPDATE
  SET descricao    = EXCLUDED.descricao,
      modulo       = EXCLUDED.modulo,
      tela         = EXCLUDED.tela,
      acao         = EXCLUDED.acao,
      atualizado_em = now();

-- ============================================================
-- 2. VINCULAR TODAS AS PERMISSÕES AO ROLE ADMIN
-- ============================================================
-- Insere somente pares que ainda não existem (ON CONFLICT DO NOTHING)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   public.roles       r
JOIN   public.permissions p ON true
WHERE  r.nome = 'Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- 3. VINCULAR PERMISSÕES BÁSICAS AO ROLE VISTORIADOR
-- ============================================================
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   public.roles       r
JOIN   public.permissions p ON p.permission_key IN (
  'DASHBOARD_VIEW',
  'UNIDADES_VIEW',
  'UNIDADES_CHANGE_STATUS',
  'CLIENTES_VIEW',
  'AGENDAMENTOS_VIEW',
  'AGENDAMENTOS_CHANGE_STATUS',
  'MAPA_VIEW',
  'CONFIG_AGENDAMENTOS_VIEW'
)
WHERE  r.nome = 'Vistoriador'
ON CONFLICT (role_id, permission_id) DO NOTHING;
