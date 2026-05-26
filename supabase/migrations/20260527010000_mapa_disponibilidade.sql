-- Mapa de Disponibilidade CVCRM
-- Empreendimentos cadastrados e valores de unidade

CREATE TABLE IF NOT EXISTS public.empreendimentos_mapa (
  id_empreendimento TEXT PRIMARY KEY,
  nome              TEXT NOT NULL,
  cidade            TEXT,
  estado            TEXT,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.unidade_valores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empreendimento   TEXT NOT NULL,
  bloco               TEXT NOT NULL,
  unidade             TEXT NOT NULL,
  valor_venda         NUMERIC(14,2),
  valor_avaliacao     NUMERIC(14,2),
  area_total          NUMERIC(10,2),
  area_privativa      NUMERIC(10,2),
  vagas               NUMERIC(5,1),
  tipo                TEXT,
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_por      UUID REFERENCES auth.users(id),
  UNIQUE (id_empreendimento, bloco, unidade)
);

CREATE INDEX IF NOT EXISTS idx_unidade_valores_emp ON public.unidade_valores(id_empreendimento);

ALTER TABLE public.empreendimentos_mapa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidade_valores      ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado
CREATE POLICY "emp_mapa_select" ON public.empreendimentos_mapa
  FOR SELECT TO authenticated USING (TRUE);

-- Escrita: apenas admin (adaptado para perfil do sistema)
CREATE POLICY "emp_mapa_write" ON public.empreendimentos_mapa
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND perfil = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND perfil = 'admin')
  );

CREATE POLICY "unidade_valores_select" ON public.unidade_valores
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "unidade_valores_write" ON public.unidade_valores
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND perfil = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND perfil = 'admin')
  );
