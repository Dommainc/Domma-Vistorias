import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ALL_PERMISSIONS, type PermissionKey } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Plus, Search, ChevronRight, Lock } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Role {
  id: string;
  nome: string;
  descricao: string | null;
  system_role: boolean;
  ativo: boolean;
  criado_em: string;
}

interface RolePermission {
  permission_id: string;
  permissions: { permission_key: string } | null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function fetchRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('system_role', { ascending: false })
    .order('nome');
  if (error) throw error;
  return data ?? [];
}

async function fetchRolePermissions(roleId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permissions(permission_key)')
    .eq('role_id', roleId);
  if (error) throw error;
  const keys = (data ?? [])
    .map((r: { permissions: { permission_key: string } | null }) => r.permissions?.permission_key)
    .filter(Boolean) as string[];
  return new Set(keys);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Perfis() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permSearch, setPermSearch] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newDescricao, setNewDescricao] = useState('');

  // Roles list
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });

  // Permissions for selected role
  const { data: rolePerms = new Set<string>(), isLoading: permsLoading } = useQuery({
    queryKey: ['role_permissions', selectedRole?.id],
    queryFn: () => fetchRolePermissions(selectedRole!.id),
    enabled: !!selectedRole,
  });

  // Toggle role ativo
  const toggleActive = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('roles').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
    onError: () => toast({ title: 'Erro ao atualizar perfil', variant: 'destructive' }),
  });

  // Create role
  const createRole = useMutation({
    mutationFn: async ({ nome, descricao }: { nome: string; descricao: string }) => {
      const { error } = await supabase.from('roles').insert({ nome, descricao, system_role: false });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      setShowNewDialog(false);
      setNewNome('');
      setNewDescricao('');
      toast({ title: 'Perfil criado com sucesso' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao criar perfil', description: e.message, variant: 'destructive' }),
  });

  // Toggle permission on role
  const togglePermission = useMutation({
    mutationFn: async ({ key, checked }: { key: string; checked: boolean }) => {
      if (!selectedRole) return;

      // Get permission id
      const { data: perm, error: pErr } = await supabase
        .from('permissions')
        .select('id')
        .eq('permission_key', key)
        .single();
      if (pErr || !perm) throw pErr ?? new Error('Permissão não encontrada');

      if (checked) {
        const { error } = await supabase
          .from('role_permissions')
          .insert({ role_id: selectedRole.id, permission_id: perm.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', selectedRole.id)
          .eq('permission_id', perm.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role_permissions', selectedRole?.id] }),
    onError: () => toast({ title: 'Erro ao atualizar permissão', variant: 'destructive' }),
  });

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const filteredRoles = roles.filter((r) =>
    r.nome.toLowerCase().includes(search.toLowerCase())
  );

  // Group permissions by module, filtered by search
  const groupedPermissions = ALL_PERMISSIONS.reduce<Record<string, typeof ALL_PERMISSIONS>>((acc, perm) => {
    if (
      permSearch &&
      !perm.descricao.toLowerCase().includes(permSearch.toLowerCase()) &&
      !perm.modulo.toLowerCase().includes(permSearch.toLowerCase()) &&
      !perm.tela.toLowerCase().includes(permSearch.toLowerCase()) &&
      !perm.acao.toLowerCase().includes(permSearch.toLowerCase())
    ) {
      return acc;
    }
    const group = `${perm.modulo} › ${perm.tela}`;
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {});

  const isAdminRole = selectedRole?.nome === 'Admin';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex gap-5 h-[calc(100vh-220px)] min-h-[500px]">
      {/* ---- Left: Role List ---- */}
      <Card className="w-72 shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Perfis
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="relative mt-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar perfil..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : filteredRoles.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum perfil encontrado.</p>
          ) : (
            <ul className="divide-y">
              {filteredRoles.map((role) => (
                <li
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent transition-colors ${
                    selectedRole?.id === role.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{role.nome}</span>
                      {role.system_role && (
                        <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <Badge
                      variant={role.ativo ? 'default' : 'secondary'}
                      className="text-[10px] mt-0.5"
                    >
                      {role.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ---- Right: Permission Editor ---- */}
      {selectedRole ? (
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{selectedRole.nome}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {selectedRole.descricao ?? 'Sem descrição'}
                </CardDescription>
              </div>
              {!selectedRole.system_role && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {selectedRole.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <Switch
                    checked={selectedRole.ativo}
                    onCheckedChange={(v) => toggleActive.mutate({ id: selectedRole.id, ativo: v })}
                  />
                </div>
              )}
            </div>

            {isAdminRole ? (
              <p className="text-xs text-muted-foreground bg-muted rounded p-2 mt-2">
                O perfil Admin possui acesso total automático a todas as permissões do sistema.
              </p>
            ) : (
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar permissão..."
                  className="pl-8 h-8 text-sm"
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                />
              </div>
            )}
          </CardHeader>

          {!isAdminRole && (
            <ScrollArea className="flex-1 px-4 pb-4">
              {Object.entries(groupedPermissions).map(([group, perms]) => (
                <div key={group} className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {group}
                  </p>
                  <div className="space-y-2">
                    {perms.map((perm) => {
                      const checked = rolePerms.has(perm.key);
                      return (
                        <label
                          key={perm.key}
                          className="flex items-start gap-2.5 cursor-pointer group"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={permsLoading || togglePermission.isPending}
                            onCheckedChange={(v) =>
                              togglePermission.mutate({ key: perm.key, checked: !!v })
                            }
                            className="mt-0.5"
                          />
                          <div>
                            <p className="text-sm leading-tight group-hover:text-primary transition-colors">
                              {perm.acao}
                            </p>
                            <p className="text-xs text-muted-foreground">{perm.descricao}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              {Object.keys(groupedPermissions).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma permissão encontrada.</p>
              )}
            </ScrollArea>
          )}
        </Card>
      ) : (
        <Card className="flex-1 flex items-center justify-center text-center text-muted-foreground">
          <div>
            <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Selecione um perfil para gerenciar suas permissões</p>
          </div>
        </Card>
      )}

      {/* ---- New Role Dialog ---- */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome</label>
              <Input
                placeholder="Ex: Gerente"
                value={newNome}
                onChange={(e) => setNewNome(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Descrição</label>
              <Input
                placeholder="Descrição do perfil"
                value={newDescricao}
                onChange={(e) => setNewDescricao(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!newNome.trim() || createRole.isPending}
              onClick={() => createRole.mutate({ nome: newNome.trim(), descricao: newDescricao.trim() })}
            >
              Criar Perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
