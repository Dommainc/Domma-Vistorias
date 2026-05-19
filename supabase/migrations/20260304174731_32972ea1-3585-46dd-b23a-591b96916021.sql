
-- Create profiles table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nome text NOT NULL,
  email text NOT NULL,
  perfil text CHECK (perfil IN ('admin', 'vistoriador')) NOT NULL,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check profile
CREATE OR REPLACE FUNCTION public.get_user_perfil(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT perfil FROM public.profiles WHERE id = _user_id
$$;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.get_user_perfil(auth.uid()) = 'admin');

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_perfil(auth.uid()) = 'admin');

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.get_user_perfil(auth.uid()) = 'admin');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'perfil', 'vistoriador')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Empreendimentos
CREATE TABLE public.empreendimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  endereco text NOT NULL,
  cidade text NOT NULL,
  descricao text,
  foto_url text,
  ativo boolean DEFAULT true,
  aceita_agendamento boolean DEFAULT false,
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE public.empreendimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view empreendimentos"
  ON public.empreendimentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert empreendimentos"
  ON public.empreendimentos FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_perfil(auth.uid()) = 'admin');

CREATE POLICY "Admins can update empreendimentos"
  ON public.empreendimentos FOR UPDATE
  TO authenticated
  USING (public.get_user_perfil(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete empreendimentos"
  ON public.empreendimentos FOR DELETE
  TO authenticated
  USING (public.get_user_perfil(auth.uid()) = 'admin');

-- Unidades
CREATE TABLE public.unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id uuid REFERENCES public.empreendimentos NOT NULL,
  bloco text,
  andar text,
  numero text NOT NULL,
  tipo text,
  status text CHECK (status IN ('apta', 'bloqueada', 'vistoriada')) DEFAULT 'apta',
  aceita_agendamento boolean DEFAULT true,
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view unidades"
  ON public.unidades FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert unidades"
  ON public.unidades FOR INSERT TO authenticated
  WITH CHECK (public.get_user_perfil(auth.uid()) = 'admin');

CREATE POLICY "Admins can update unidades"
  ON public.unidades FOR UPDATE TO authenticated
  USING (public.get_user_perfil(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete unidades"
  ON public.unidades FOR DELETE TO authenticated
  USING (public.get_user_perfil(auth.uid()) = 'admin');

-- Clientes
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid REFERENCES public.unidades NOT NULL,
  nome_completo text NOT NULL,
  cpf text NOT NULL,
  data_nascimento date NOT NULL,
  email text NOT NULL,
  telefone text,
  token_agendamento uuid DEFAULT gen_random_uuid() UNIQUE,
  token_expira_em timestamptz,
  token_usado boolean DEFAULT false,
  criado_por uuid REFERENCES public.profiles,
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view clientes"
  ON public.clientes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert clientes"
  ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clientes"
  ON public.clientes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete clientes"
  ON public.clientes FOR DELETE TO authenticated
  USING (public.get_user_perfil(auth.uid()) = 'admin');

CREATE POLICY "Public can view cliente by token"
  ON public.clientes FOR SELECT TO anon
  USING (token_agendamento IS NOT NULL);

-- Documentos
CREATE TABLE public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes NOT NULL,
  nome_arquivo text NOT NULL,
  tipo_documento text,
  arquivo_url text NOT NULL,
  tamanho_bytes bigint,
  enviado_por uuid REFERENCES public.profiles,
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view documentos"
  ON public.documentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert documentos"
  ON public.documentos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can delete documentos"
  ON public.documentos FOR DELETE TO authenticated
  USING (public.get_user_perfil(auth.uid()) = 'admin');

-- Disponibilidade
CREATE TABLE public.disponibilidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_id uuid REFERENCES public.empreendimentos,
  data date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL,
  intervalo_minutos int DEFAULT 60,
  vagas_por_horario int DEFAULT 1,
  ativo boolean DEFAULT true
);

ALTER TABLE public.disponibilidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view disponibilidade"
  ON public.disponibilidade FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public can view active disponibilidade"
  ON public.disponibilidade FOR SELECT TO anon USING (ativo = true);

CREATE POLICY "Admins can insert disponibilidade"
  ON public.disponibilidade FOR INSERT TO authenticated
  WITH CHECK (public.get_user_perfil(auth.uid()) = 'admin');

CREATE POLICY "Admins can update disponibilidade"
  ON public.disponibilidade FOR UPDATE TO authenticated
  USING (public.get_user_perfil(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete disponibilidade"
  ON public.disponibilidade FOR DELETE TO authenticated
  USING (public.get_user_perfil(auth.uid()) = 'admin');

-- Agendamentos
CREATE TABLE public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes NOT NULL,
  unidade_id uuid REFERENCES public.unidades NOT NULL,
  data_hora timestamptz NOT NULL,
  status text CHECK (status IN ('pendente', 'confirmado', 'realizado', 'cancelado', 'reagendado')) DEFAULT 'pendente',
  observacoes text,
  confirmado_em timestamptz,
  realizado_em timestamptz,
  cancelado_em timestamptz,
  motivo_cancelamento text,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agendamentos"
  ON public.agendamentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert agendamentos"
  ON public.agendamentos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Public can insert agendamentos"
  ON public.agendamentos FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Authenticated users can update agendamentos"
  ON public.agendamentos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Public can view agendamentos"
  ON public.agendamentos FOR SELECT TO anon USING (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_agendamentos_updated_at
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for client documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos-clientes', 'documentos-clientes', false);

CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos-clientes');

CREATE POLICY "Authenticated users can view documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-clientes');

CREATE POLICY "Admins can delete documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos-clientes');

-- Public access to unidades for scheduling portal
CREATE POLICY "Public can view unidades"
  ON public.unidades FOR SELECT TO anon USING (true);

-- Public access to empreendimentos for scheduling portal
CREATE POLICY "Public can view empreendimentos"
  ON public.empreendimentos FOR SELECT TO anon USING (true);
