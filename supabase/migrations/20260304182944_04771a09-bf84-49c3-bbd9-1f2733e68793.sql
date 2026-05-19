
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- === agendamentos ===
DROP POLICY IF EXISTS "Authenticated users can insert agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Authenticated users can update agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Authenticated users can view agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Public can insert agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Public can view agendamentos" ON public.agendamentos;

CREATE POLICY "Authenticated users can insert agendamentos" ON public.agendamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update agendamentos" ON public.agendamentos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view agendamentos" ON public.agendamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can insert agendamentos" ON public.agendamentos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can view agendamentos" ON public.agendamentos FOR SELECT TO anon USING (true);

-- === clientes ===
DROP POLICY IF EXISTS "Admins can delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can view clientes" ON public.clientes;
DROP POLICY IF EXISTS "Public can view cliente by token" ON public.clientes;

CREATE POLICY "Admins can delete clientes" ON public.clientes FOR DELETE TO authenticated USING (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Authenticated users can insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clientes" ON public.clientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can view clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can view cliente by token" ON public.clientes FOR SELECT TO anon USING (token_agendamento IS NOT NULL);

-- === configuracoes ===
DROP POLICY IF EXISTS "Admins can insert configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "Admins can update configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "Authenticated users can view configuracoes" ON public.configuracoes;

CREATE POLICY "Admins can insert configuracoes" ON public.configuracoes FOR INSERT TO authenticated WITH CHECK (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Admins can update configuracoes" ON public.configuracoes FOR UPDATE TO authenticated USING (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Authenticated users can view configuracoes" ON public.configuracoes FOR SELECT TO authenticated USING (true);

-- === disponibilidade ===
DROP POLICY IF EXISTS "Admins can delete disponibilidade" ON public.disponibilidade;
DROP POLICY IF EXISTS "Admins can insert disponibilidade" ON public.disponibilidade;
DROP POLICY IF EXISTS "Admins can update disponibilidade" ON public.disponibilidade;
DROP POLICY IF EXISTS "Authenticated users can view disponibilidade" ON public.disponibilidade;
DROP POLICY IF EXISTS "Public can view active disponibilidade" ON public.disponibilidade;

CREATE POLICY "Admins can delete disponibilidade" ON public.disponibilidade FOR DELETE TO authenticated USING (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Admins can insert disponibilidade" ON public.disponibilidade FOR INSERT TO authenticated WITH CHECK (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Admins can update disponibilidade" ON public.disponibilidade FOR UPDATE TO authenticated USING (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Authenticated users can view disponibilidade" ON public.disponibilidade FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can view active disponibilidade" ON public.disponibilidade FOR SELECT TO anon USING (ativo = true);

-- === documentos ===
DROP POLICY IF EXISTS "Admins can delete documentos" ON public.documentos;
DROP POLICY IF EXISTS "Authenticated users can insert documentos" ON public.documentos;
DROP POLICY IF EXISTS "Authenticated users can view documentos" ON public.documentos;

CREATE POLICY "Admins can delete documentos" ON public.documentos FOR DELETE TO authenticated USING (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Authenticated users can insert documentos" ON public.documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can view documentos" ON public.documentos FOR SELECT TO authenticated USING (true);

-- === empreendimentos ===
DROP POLICY IF EXISTS "Admins can delete empreendimentos" ON public.empreendimentos;
DROP POLICY IF EXISTS "Admins can insert empreendimentos" ON public.empreendimentos;
DROP POLICY IF EXISTS "Admins can update empreendimentos" ON public.empreendimentos;
DROP POLICY IF EXISTS "Authenticated users can view empreendimentos" ON public.empreendimentos;
DROP POLICY IF EXISTS "Public can view empreendimentos" ON public.empreendimentos;

CREATE POLICY "Admins can delete empreendimentos" ON public.empreendimentos FOR DELETE TO authenticated USING (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Admins can insert empreendimentos" ON public.empreendimentos FOR INSERT TO authenticated WITH CHECK (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Admins can update empreendimentos" ON public.empreendimentos FOR UPDATE TO authenticated USING (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Authenticated users can view empreendimentos" ON public.empreendimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can view empreendimentos" ON public.empreendimentos FOR SELECT TO anon USING (true);

-- === log_envios_link ===
DROP POLICY IF EXISTS "Authenticated users can insert log_envios_link" ON public.log_envios_link;
DROP POLICY IF EXISTS "Authenticated users can view log_envios_link" ON public.log_envios_link;

CREATE POLICY "Authenticated users can insert log_envios_link" ON public.log_envios_link FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can view log_envios_link" ON public.log_envios_link FOR SELECT TO authenticated USING (true);

-- === profiles ===
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- === unidades ===
DROP POLICY IF EXISTS "Admins can delete unidades" ON public.unidades;
DROP POLICY IF EXISTS "Admins can insert unidades" ON public.unidades;
DROP POLICY IF EXISTS "Admins can update unidades" ON public.unidades;
DROP POLICY IF EXISTS "Authenticated users can view unidades" ON public.unidades;
DROP POLICY IF EXISTS "Public can view unidades" ON public.unidades;

CREATE POLICY "Admins can delete unidades" ON public.unidades FOR DELETE TO authenticated USING (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Admins can insert unidades" ON public.unidades FOR INSERT TO authenticated WITH CHECK (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Admins can update unidades" ON public.unidades FOR UPDATE TO authenticated USING (get_user_perfil(auth.uid()) = 'admin');
CREATE POLICY "Authenticated users can view unidades" ON public.unidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can view unidades" ON public.unidades FOR SELECT TO anon USING (true);
