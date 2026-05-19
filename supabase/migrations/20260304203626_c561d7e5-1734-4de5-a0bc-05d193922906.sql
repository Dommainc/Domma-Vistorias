-- Allow vistoriador to update unidades (for status changes)
CREATE POLICY "Vistoriadores can update unidades"
ON public.unidades
FOR UPDATE
TO authenticated
USING (get_user_perfil(auth.uid()) = 'vistoriador')
WITH CHECK (get_user_perfil(auth.uid()) = 'vistoriador');

-- Allow admin and vistoriador to delete agendamentos
CREATE POLICY "Admin and vistoriador can delete agendamentos"
ON public.agendamentos
FOR DELETE
TO authenticated
USING (get_user_perfil(auth.uid()) IN ('admin', 'vistoriador'));

-- Allow vistoriador to update configuracoes
CREATE POLICY "Vistoriadores can update configuracoes"
ON public.configuracoes
FOR UPDATE
TO authenticated
USING (get_user_perfil(auth.uid()) = 'vistoriador')
WITH CHECK (get_user_perfil(auth.uid()) = 'vistoriador');

-- Allow vistoriador to insert configuracoes
CREATE POLICY "Vistoriadores can insert configuracoes"
ON public.configuracoes
FOR INSERT
TO authenticated
WITH CHECK (get_user_perfil(auth.uid()) = 'vistoriador');