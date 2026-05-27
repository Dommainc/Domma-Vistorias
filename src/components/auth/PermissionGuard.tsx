import { type ReactNode } from 'react';
import { type PermissionKey } from '@/lib/permissions';
import { usePermission } from '@/hooks/usePermission';
import { PermissionDenied } from './PermissionDenied';

interface PermissionGuardProps {
  permissionKey: PermissionKey;
  children: ReactNode;
  /** 'screen' = bloco grande | 'section' = bloco compacto inline */
  context?: 'screen' | 'section';
}

/**
 * Envolve um trecho de tela que requer permissão.
 * Se o usuário não tiver a permissão, exibe PermissionDenied em vez de ocultar o conteúdo.
 */
export function PermissionGuard({ permissionKey, children, context = 'screen' }: PermissionGuardProps) {
  const { hasPermission, loading } = usePermission();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasPermission(permissionKey)) {
    return <PermissionDenied permissionKey={permissionKey} context={context} />;
  }

  return <>{children}</>;
}
