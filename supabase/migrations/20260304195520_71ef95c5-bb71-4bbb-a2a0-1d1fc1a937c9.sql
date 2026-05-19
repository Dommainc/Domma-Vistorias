
-- BLOCK 1.1: Update unidades status values
ALTER TABLE unidades DROP CONSTRAINT IF EXISTS unidades_status_check;
UPDATE unidades SET status = 'aguardando_liberacao' WHERE status NOT IN ('aguardando_liberacao', 'unidade_liberada');
ALTER TABLE unidades ADD CONSTRAINT unidades_status_check CHECK (status IN ('aguardando_liberacao', 'unidade_liberada'));

-- BLOCK 1.1: Add disponibilidade columns to unidades
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS disponibilidade_ativa boolean DEFAULT false;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS disponibilidade_data_inicio date;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS disponibilidade_data_fim date;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS disponibilidade_hora_inicio time;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS disponibilidade_hora_fim time;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS disponibilidade_dias_semana int[] DEFAULT '{1,2,3,4,5}';

-- BLOCK 1.1: Update agendamentos status values
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_status_check;
UPDATE agendamentos SET status = 'vistoria_agendada' WHERE status NOT IN ('vistoria_agendada','vistoria_finalizada','vistoria_cancelada');
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_status_check CHECK (status IN ('vistoria_agendada', 'vistoria_finalizada', 'vistoria_cancelada'));
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS cancelado_por_tipo text CHECK (cancelado_por_tipo IN ('cliente', 'admin', 'vistoriador'));

-- BLOCK 1.2: historico_status table
CREATE TABLE IF NOT EXISTS historico_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo text NOT NULL CHECK (entidade_tipo IN ('unidade', 'agendamento')),
  entidade_id uuid NOT NULL,
  status_anterior text,
  status_novo text NOT NULL,
  alterado_por_tipo text CHECK (alterado_por_tipo IN ('sistema', 'admin', 'vistoriador', 'cliente')),
  alterado_por_id uuid,
  alterado_por_nome text,
  motivo text,
  criado_em timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_historico_entidade ON historico_status(entidade_tipo, entidade_id, criado_em DESC);

-- RLS for historico_status
ALTER TABLE historico_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view historico" ON historico_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert historico" ON historico_status FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Public can view historico" ON historico_status FOR SELECT TO anon USING (true);

-- BLOCK 1.3: sessoes_cliente table
CREATE TABLE IF NOT EXISTS sessoes_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  token_sessao uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '8 hours'),
  criado_em timestamptz DEFAULT now()
);
ALTER TABLE sessoes_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage sessoes" ON sessoes_cliente FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Auth can manage sessoes" ON sessoes_cliente FOR ALL TO authenticated USING (true) WITH CHECK (true);
