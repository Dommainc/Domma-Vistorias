-- ============================================================
-- MIGRATION: Gestão de Liberação de Unidades para Vistoria
-- ============================================================

-- ── 1. Adicionar perfil 'relacionamento' ao CHECK de profiles
-- Necessário para o perfil que libera a 2ª alçada

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_perfil_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_perfil_check
  CHECK (perfil IN ('admin', 'vistoriador', 'relacionamento', 'gerente'));

-- ── 2. Inserir role 'Relacionamento' no RBAC
INSERT INTO public.roles (nome, descricao, system_role, ativo)
VALUES ('Relacionamento', 'Equipe de relacionamento com cliente — libera 2ª alçada', true, true)
ON CONFLICT (nome) DO NOTHING;

-- ── 3. Tabela: unidade_config
-- Núcleo do sistema de liberação.
-- Usa cvcrm_id_empreendimento (TEXT) por ser o identificador estável no mundo do mapa.

CREATE TABLE IF NOT EXISTS public.unidade_config (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vínculo com o empreendimento do mapa (CVCRM)
  cvcrm_id_empreendimento   text NOT NULL
    REFERENCES public.empreendimentos_mapa(id_empreendimento) ON DELETE CASCADE,

  -- Vínculo com a unidade no CVCRM (chave principal de vínculo)
  cvcrm_id_unidade          integer NOT NULL,

  -- Snapshots para auditoria (imutáveis após criação)
  cvcrm_bloco               text,
  cvcrm_numero              text,

  -- Datas de agendamento
  agendar_a_partir_de       date,
  liberar_para_agendamento  date,

  -- Alçada 1 — Vistoriador
  alcada1_liberada          boolean NOT NULL DEFAULT false,
  alcada1_user_id           uuid REFERENCES auth.users(id),
  alcada1_liberada_em       timestamptz,

  -- Alçada 2 — Relacionamento
  alcada2_liberada          boolean NOT NULL DEFAULT false,
  alcada2_user_id           uuid REFERENCES auth.users(id),
  alcada2_liberada_em       timestamptz,

  -- Controle
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  UNIQUE (cvcrm_id_empreendimento, cvcrm_id_unidade)
);

-- Constraint: liberar_para_agendamento >= agendar_a_partir_de
ALTER TABLE public.unidade_config
  ADD CONSTRAINT check_datas_agendamento
  CHECK (
    liberar_para_agendamento IS NULL
    OR agendar_a_partir_de IS NULL
    OR liberar_para_agendamento >= agendar_a_partir_de
  );

-- Constraint: alcada2 só pode ser true se alcada1 também for true
ALTER TABLE public.unidade_config
  ADD CONSTRAINT check_alcada_ordem
  CHECK (
    alcada2_liberada = false
    OR alcada1_liberada = true
  );

-- Trigger para updated_at automático (reusa função existente)
CREATE TRIGGER unidade_config_updated_at
  BEFORE UPDATE ON public.unidade_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_unidade_config_emp
  ON public.unidade_config(cvcrm_id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_unidade_config_id_unidade
  ON public.unidade_config(cvcrm_id_unidade);

-- ── 4. Tabela: unidade_config_log (auditoria imutável)

CREATE TABLE IF NOT EXISTS public.unidade_config_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_config_id   uuid NOT NULL REFERENCES public.unidade_config(id) ON DELETE CASCADE,
  cvcrm_id_empreendimento text NOT NULL,
  cvcrm_id_unidade    integer NOT NULL,
  user_id             uuid NOT NULL REFERENCES auth.users(id),
  perfil_usuario      text NOT NULL,
  acao                text NOT NULL,
  detalhe             jsonb,
  criado_em           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unidade_config_log_config
  ON public.unidade_config_log(unidade_config_id);
CREATE INDEX IF NOT EXISTS idx_unidade_config_log_emp
  ON public.unidade_config_log(cvcrm_id_empreendimento);

-- ── 5. Tabela: empreendimento_config (configurações globais)

CREATE TABLE IF NOT EXISTS public.empreendimento_config (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cvcrm_id_empreendimento   text NOT NULL UNIQUE
    REFERENCES public.empreendimentos_mapa(id_empreendimento) ON DELETE CASCADE,
  aceita_agendamento        boolean NOT NULL DEFAULT false,
  agendar_a_partir_de       date,
  liberar_para_agendamento  date,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER empreendimento_config_updated_at
  BEFORE UPDATE ON public.empreendimento_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 6. RLS

ALTER TABLE public.unidade_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidade_config_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empreendimento_config ENABLE ROW LEVEL SECURITY;

-- unidade_config: leitura para todos autenticados
CREATE POLICY "unidade_config_select"
  ON public.unidade_config FOR SELECT
  TO authenticated USING (true);

-- unidade_config: escrita para autenticados (lógica de permissão na camada de serviço)
CREATE POLICY "unidade_config_insert"
  ON public.unidade_config FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "unidade_config_update"
  ON public.unidade_config FOR UPDATE
  TO authenticated USING (true);

-- unidade_config_log: leitura para todos autenticados
CREATE POLICY "unidade_config_log_select"
  ON public.unidade_config_log FOR SELECT
  TO authenticated USING (true);

-- unidade_config_log: inserção para todos autenticados
CREATE POLICY "unidade_config_log_insert"
  ON public.unidade_config_log FOR INSERT
  TO authenticated WITH CHECK (true);

-- empreendimento_config: leitura para todos autenticados
CREATE POLICY "empreendimento_config_select"
  ON public.empreendimento_config FOR SELECT
  TO authenticated USING (true);

-- empreendimento_config: escrita apenas para admin
CREATE POLICY "empreendimento_config_write"
  ON public.empreendimento_config FOR ALL
  TO authenticated
  USING (public.get_user_perfil(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_perfil(auth.uid()) = 'admin');

-- ── 7. Permissões RBAC para alçadas

INSERT INTO public.permissions (permission_key, modulo, tela, acao, descricao)
VALUES
  ('ALCADA1_LIBERAR',    'Liberação', 'Unidades', 'Liberar 1ª Alçada',  'Liberar 1ª alçada de unidades para vistoria (perfil Vistoriador)'),
  ('ALCADA2_LIBERAR',    'Liberação', 'Unidades', 'Liberar 2ª Alçada',  'Liberar 2ª alçada de unidades para vistoria (perfil Relacionamento)'),
  ('ALCADA_REVERTER',    'Liberação', 'Unidades', 'Reverter Alçada',    'Reverter alçada de liberação (perfil Admin)'),
  ('LIBERACAO_VIEW',     'Liberação', 'Unidades', 'Visualizar',         'Visualizar tabela de liberação de unidades'),
  ('CONFIG_EMP_DATAS',   'Liberação', 'Empreendimento', 'Editar Datas', 'Editar datas de agendamento nas unidades')
ON CONFLICT (permission_key) DO NOTHING;

-- Associar ALCADA1_LIBERAR ao role Vistoriador
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.nome = 'Vistoriador' AND p.permission_key = 'ALCADA1_LIBERAR'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.nome = 'Vistoriador' AND p.permission_key = 'LIBERACAO_VIEW'
ON CONFLICT DO NOTHING;

-- Associar ALCADA2_LIBERAR ao role Relacionamento
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.nome = 'Relacionamento' AND p.permission_key = 'ALCADA2_LIBERAR'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.nome = 'Relacionamento' AND p.permission_key = 'LIBERACAO_VIEW'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.nome = 'Relacionamento' AND p.permission_key = 'CONFIG_EMP_DATAS'
ON CONFLICT DO NOTHING;
