
-- Drop old constraint
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_status_check;

-- Migrate data  
UPDATE agendamentos SET status = 'vistoria_concluida' WHERE status = 'vistoria_finalizada';
UPDATE agendamentos SET status = 'aguardando_confirmacao' WHERE status = 'pendente';

-- Add new constraint
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_status_check
  CHECK (status IN (
    'aguardando_confirmacao',
    'vistoria_agendada',
    'vistoria_concluida',
    'vistoria_cancelada'
  ));

-- Update historico
UPDATE historico_status SET status_novo = 'vistoria_concluida' WHERE status_novo = 'vistoria_finalizada';
UPDATE historico_status SET status_anterior = 'vistoria_concluida' WHERE status_anterior = 'vistoria_finalizada';
