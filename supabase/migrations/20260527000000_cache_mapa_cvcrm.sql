-- Cache persistente do mapa de disponibilidade CVCRM
-- Evita buscar do CVCRM a cada requisição — retorna em < 50ms

CREATE TABLE IF NOT EXISTS public.cache_mapa_cvcrm (
  cvcrm_id       INTEGER PRIMARY KEY,
  dados          JSONB        NOT NULL DEFAULT '[]',
  paginacao      JSONB,
  atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  total_unidades INTEGER      GENERATED ALWAYS AS (jsonb_array_length(dados)) STORED
);

-- RLS: qualquer autenticado pode ler; ninguém escreve pelo cliente (só edge function com service_role)
ALTER TABLE public.cache_mapa_cvcrm ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cache_mapa_select" ON public.cache_mapa_cvcrm
  FOR SELECT TO authenticated USING (true);

-- Realtime: habilitar para notificar o frontend quando o cache mudar
ALTER PUBLICATION supabase_realtime ADD TABLE public.cache_mapa_cvcrm;
