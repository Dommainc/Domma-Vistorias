
-- Add columns to clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS link_enviado_em timestamptz;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS link_enviado_por uuid REFERENCES public.profiles(id);

-- Configuracoes table
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text UNIQUE NOT NULL,
  valor text NOT NULL,
  descricao text,
  atualizado_em timestamptz DEFAULT now(),
  atualizado_por uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view configuracoes" ON public.configuracoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update configuracoes" ON public.configuracoes FOR UPDATE TO authenticated USING (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Admins can insert configuracoes" ON public.configuracoes FOR INSERT TO authenticated WITH CHECK (get_user_perfil(auth.uid()) = 'admin');

-- Insert default config values
INSERT INTO public.configuracoes (chave, valor, descricao) VALUES
  ('agendamento_status_inicial', 'pendente', 'Status ao criar agendamento pelo cliente'),
  ('agendamento_prazo_minimo_horas', '24', 'Horas mínimas de antecedência para agendar'),
  ('agendamento_prazo_maximo_dias', '60', 'Dias máximos à frente para agendar'),
  ('agendamento_permite_cancelamento_cliente', 'false', 'Cliente pode cancelar pelo portal'),
  ('email_confirmacao_automatico', 'true', 'Enviar e-mail ao confirmar agendamento'),
  ('email_lembrete_24h', 'true', 'Enviar lembrete 24h antes')
ON CONFLICT (chave) DO NOTHING;

-- Log de envios de link
CREATE TABLE IF NOT EXISTS public.log_envios_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes(id) NOT NULL,
  enviado_por uuid REFERENCES public.profiles(id) NOT NULL,
  enviado_em timestamptz DEFAULT now(),
  email_destino text NOT NULL,
  sucesso boolean DEFAULT true
);

ALTER TABLE public.log_envios_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view log_envios_link" ON public.log_envios_link FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert log_envios_link" ON public.log_envios_link FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket for empreendimentos images
INSERT INTO storage.buckets (id, name, public) VALUES ('empreendimentos', 'empreendimentos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload empreendimentos images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'empreendimentos');
CREATE POLICY "Anyone can view empreendimentos images" ON storage.objects FOR SELECT USING (bucket_id = 'empreendimentos');
CREATE POLICY "Admins can delete empreendimentos images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'empreendimentos');

-- Enable realtime for agendamentos
ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;
