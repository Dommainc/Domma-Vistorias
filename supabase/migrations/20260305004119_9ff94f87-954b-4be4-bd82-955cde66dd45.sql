
-- Fix default status on agendamentos (pendente no longer valid)
ALTER TABLE agendamentos ALTER COLUMN status SET DEFAULT 'aguardando_confirmacao';
