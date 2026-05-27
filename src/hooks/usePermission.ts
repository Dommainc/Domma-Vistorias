import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_PERMISSIONS, PERMISSIONS, type PermissionKey } from '@/lib/permissions';

interface UsePermissionReturn {
  permissions: Set<string>;
  hasPermission: (key: PermissionKey) => boolean;
  hasAnyPermission: (keys: PermissionKey[]) => boolean;
  hasAllPermissions: (keys: PermissionKey[]) => boolean;
  /** Executa fn() se tiver permissão; caso contrário exibe mensagem de erro. */
  guardAction: (key: PermissionKey, fn: () => void) => () => void;
  loading: boolean;
}

async function fetchPermsByRoleId(roleId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permissions(permission_key)')
    .eq('role_id', roleId);
  if (error) throw error;
  const keys = (data ?? [])
    .map((row: { permissions: { permission_key: string } | null }) => row.permissions?.permission_key)
    .filter(Boolean) as string[];
  return new Set(keys);
}

async function fetchPermsByPerfilName(perfil: string): Promise<Set<string>> {
  // Fallback para usuários com role_id = null — busca pelo nome do perfil
  const { data: role, error: rErr } = await supabase
    .from('roles')
    .select('id')
    .ilike('nome', perfil)
    .maybeSingle();
  if (rErr || !role) return new Set();
  return fetchPermsByRoleId(role.id);
}

export function usePermission(): UsePermissionReturn {
  const { profile, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !profile) {
      setPermissions(new Set());
      setLoading(authLoading);
      return;
    }

    // Admin tem acesso total sempre — sem depender do banco
    if (profile.perfil === 'admin') {
      setPermissions(new Set(ADMIN_PERMISSIONS));
      setLoading(false);
      return;
    }

    setLoading(true);
    const roleId = (profile as { role_id?: string | null }).role_id;

    const load = roleId
      ? fetchPermsByRoleId(roleId)
      : fetchPermsByPerfilName(profile.perfil);

    load
      .then(setPermissions)
      .catch((e) => {
        console.error('usePermission: erro ao buscar permissões', e);
        setPermissions(new Set());
      })
      .finally(() => setLoading(false));
  }, [profile, authLoading]);

  const hasPermission = useCallback(
    (key: PermissionKey) => permissions.has(key),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (keys: PermissionKey[]) => keys.some((k) => permissions.has(k)),
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (keys: PermissionKey[]) => keys.every((k) => permissions.has(k)),
    [permissions]
  );

  const guardAction = useCallback(
    (key: PermissionKey, fn: () => void) =>
      () => {
        if (permissions.has(key)) {
          fn();
          return;
        }
        const def = PERMISSIONS[key];
        toast.error('Acesso negado', {
          description: `${def.modulo} › ${def.tela} › ${def.acao}\nPermissão necessária: ${key}`,
          duration: 5000,
        });
      },
    [permissions]
  );

  return { permissions, hasPermission, hasAnyPermission, hasAllPermissions, guardAction, loading };
}
