-- FASE 1: Sistema RBAC Completo
-- Migration: 20260527120000_rbac_system.sql
-- Adiciona tabelas de Roles, Permissions e Role-Permission mapping
-- Backward compatible: coluna role_id em profiles é NULLABLE

-- Tabela de Roles (Perfis)
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  system_role boolean DEFAULT false,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Tabela de Permissões
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text NOT NULL UNIQUE,
  modulo text NOT NULL,
  tela text NOT NULL,
  acao text NOT NULL,
  descricao text,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Tabela de Mapeamento Role -> Permission
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  criado_em timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Estender profiles com role_id (backward compatible - NULLABLE)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON public.permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON public.profiles(role_id);

-- RLS para Roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'roles' AND policyname = 'Roles - Admin only'
  ) THEN
    CREATE POLICY "Roles - Admin only"
      ON public.roles FOR ALL
      USING (public.get_user_perfil(auth.uid()) = 'admin');
  END IF;
END $$;

-- RLS para Permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'permissions' AND policyname = 'Permissions - Authenticated can read'
  ) THEN
    CREATE POLICY "Permissions - Authenticated can read"
      ON public.permissions FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'permissions' AND policyname = 'Permissions - Admin can modify'
  ) THEN
    CREATE POLICY "Permissions - Admin can modify"
      ON public.permissions FOR ALL
      USING (public.get_user_perfil(auth.uid()) = 'admin');
  END IF;
END $$;

-- RLS para Role Permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'role_permissions' AND policyname = 'Role permissions - Authenticated can read'
  ) THEN
    CREATE POLICY "Role permissions - Authenticated can read"
      ON public.role_permissions FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'role_permissions' AND policyname = 'Role permissions - Admin can write'
  ) THEN
    CREATE POLICY "Role permissions - Admin can write"
      ON public.role_permissions FOR ALL
      USING (public.get_user_perfil(auth.uid()) = 'admin');
  END IF;
END $$;

-- Inserir roles predefinidas (system_role = true)
INSERT INTO public.roles (nome, descricao, system_role, ativo)
VALUES
  ('Admin', 'Acesso total ao sistema', true, true),
  ('Vistoriador', 'Acesso restrito para vistoria', true, true),
  ('Gerente', 'Gerente de projetos', false, true)
ON CONFLICT (nome) DO NOTHING;
