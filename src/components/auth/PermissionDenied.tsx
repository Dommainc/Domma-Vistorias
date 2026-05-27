import { ShieldOff } from 'lucide-react';
import { PERMISSIONS, type PermissionKey } from '@/lib/permissions';

interface PermissionDeniedProps {
  permissionKey: PermissionKey;
  /** 'screen' = bloco grande centralizdo | 'section' = bloco compacto inline */
  context?: 'screen' | 'section';
}

export function PermissionDenied({ permissionKey, context = 'screen' }: PermissionDeniedProps) {
  const def = PERMISSIONS[permissionKey];

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 text-center ${
        context === 'screen' ? 'min-h-[320px] p-10' : 'py-6 px-4'
      }`}
    >
      <ShieldOff className={`text-destructive/50 ${context === 'screen' ? 'h-12 w-12' : 'h-8 w-8'}`} />

      <div className="space-y-1">
        <p className="font-semibold text-destructive">Acesso negado</p>
        <p className="text-sm text-muted-foreground">
          Você não possui permissão para realizar esta ação.
        </p>
      </div>

      <div className="rounded-md bg-muted px-3 py-2 text-left">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{def.modulo}</span>
          {' › '}
          <span className="font-medium text-foreground">{def.tela}</span>
          {' › '}
          {def.acao}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">{permissionKey}</p>
      </div>
    </div>
  );
}
