import { UserCog, Plus, Pencil, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";


function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(b => chars[b % chars.length]).join('');
}

// ---------------------------------------------------------------------------
// EditUserForm — componente separado para evitar problemas de IIFE em JSX
// ---------------------------------------------------------------------------
interface EditUserFormProps {
  editUser: any;
  currentUserId?: string;
  editNome: string; setEditNome: (v: string) => void;
  editRoleId: string | null; setEditRoleId: (v: string | null) => void;
  editAtivo: boolean; setEditAtivo: (v: boolean) => void;
  roles: any[];
  onResetPassword: () => void;
}

function EditUserForm({
  editUser, currentUserId,
  editNome, setEditNome,
  editRoleId, setEditRoleId,
  editAtivo, setEditAtivo,
  roles, onResetPassword,
}: EditUserFormProps) {
  const isSelf = editUser.id === currentUserId;

  return (
    <div className="space-y-4">
      {isSelf && (
        <p className="text-xs text-muted-foreground bg-muted rounded p-2">
          Você está editando seu próprio usuário. Perfil e status não podem ser alterados.
        </p>
      )}
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input value={editNome} onChange={e => setEditNome(e.target.value)} />
      </div>
      <div className={`space-y-2 ${isSelf ? 'opacity-50 pointer-events-none' : ''}`}>
        <Label>Perfil *</Label>
        <Select
          value={editRoleId ?? '__none__'}
          onValueChange={v => setEditRoleId(v === '__none__' ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar perfil..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Nenhum</SelectItem>
            {roles.map((r: any) => (
              <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={`flex items-center gap-2 ${isSelf ? 'opacity-50 pointer-events-none' : ''}`}>
        <Switch checked={editAtivo} onCheckedChange={setEditAtivo} />
        <Label>Ativo</Label>
      </div>
      <Button variant="outline" onClick={onResetPassword}>
        <KeyRound className="mr-2 h-4 w-4" /> Redefinir Senha
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------
export default function Usuarios({ embedded }: { embedded?: boolean } = {}) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("all");

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRoleId, setNewRoleId] = useState<string | null>(null);
  const [newSenha, setNewSenha] = useState(generatePassword());
  const [creating, setCreating] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editNome, setEditNome] = useState("");
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [editAtivo, setEditAtivo] = useState(true);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, roles(id, nome)')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('roles')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const filtered = profiles?.filter(p => {
    if (filtroStatus !== 'all' && String(p.ativo) !== filtroStatus) return false;
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase()) && !p.email.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!newNome.trim() || !newEmail.trim() || !newSenha) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    if (!newRoleId) {
      toast.error("Selecione um perfil para o usuário"); return;
    }
    const selectedRole = roles.find(r => r.id === newRoleId);
    const perfil = selectedRole ? selectedRole.nome.toLowerCase() : 'vistoriador';

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'create', email: newEmail.trim(), password: newSenha, nome: newNome.trim(), perfil },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.user_id) {
        await supabase.from('profiles').update({ role_id: newRoleId } as any).eq('id', data.user_id);
      }

      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success("Usuário criado com sucesso!", {
        description: "Senha temporária: " + newSenha,
        action: { label: "Copiar Senha", onClick: () => navigator.clipboard.writeText(newSenha) },
        duration: 10000,
      });
      setCreateOpen(false);
      setNewNome(""); setNewEmail(""); setNewRoleId(null); setNewSenha(generatePassword());
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    const isSelf = editUser.id === currentUser?.id;
    try {
      const updatePayload: any = { nome: editNome, role_id: editRoleId };
      if (!isSelf) {
        const selectedRole = roles.find(r => r.id === editRoleId);
        updatePayload.perfil = selectedRole ? selectedRole.nome.toLowerCase() : editUser.perfil;
        updatePayload.ativo  = editAtivo;
      }
      const { error } = await supabase.from('profiles').update(updatePayload).eq('id', editUser.id);
      if (error) throw error;

      if (!isSelf) {
        if (!editAtivo && editUser.ativo) {
          await supabase.functions.invoke('manage-users', { body: { action: 'ban', user_id: editUser.id } });
        } else if (editAtivo && !editUser.ativo) {
          await supabase.functions.invoke('manage-users', { body: { action: 'unban', user_id: editUser.id } });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success("Usuário atualizado!");
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar");
    }
  };

  const handleResetPassword = async () => {
    if (!editUser) return;
    const newPass = generatePassword();
    try {
      const { error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'reset_password', user_id: editUser.id, password: newPass },
      });
      if (error) throw error;
      toast.success("Nova senha gerada!", {
        description: "Senha: " + newPass,
        action: { label: "Copiar", onClick: () => navigator.clipboard.writeText(newPass) },
        duration: 10000,
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao redefinir senha");
    }
  };

  const openEdit = (p: any) => {
    setEditUser(p);
    setEditNome(p.nome);
    setEditAtivo(p.ativo ?? true);
    // Usa role_id direto; se null, tenta encontrar o role pelo perfil
    let roleId = p.role_id ?? null;
    if (!roleId) {
      const match = (roles as any[]).find(r => r.nome.toLowerCase() === p.perfil?.toLowerCase());
      roleId = match?.id ?? null;
    }
    setEditRoleId(roleId);
    setEditOpen(true);
  };

  const getRoleLabel = (p: any) => (p as any).roles?.nome ?? (p.perfil === 'admin' ? 'Admin' : 'Vistoriador');

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="font-heading text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Novo Usuário</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input value={newNome} onChange={e => setNewNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Perfil *</Label>
                <Select
                  value={newRoleId ?? '__none__'}
                  onValueChange={v => setNewRoleId(v === '__none__' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar perfil..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Senha Temporária *</Label>
                <div className="flex gap-2">
                  <Input value={newSenha} onChange={e => setNewSenha(e.target.value)} className="font-mono" />
                  <Button variant="outline" size="sm" onClick={() => setNewSenha(generatePassword())}>Gerar</Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button onClick={handleCreate} disabled={creating}>{creating ? "Criando..." : "Criar Usuário"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Buscar nome ou e-mail..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-xs" />
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Ativo</SelectItem>
            <SelectItem value="false">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="h-4 w-4" /> Usuários {filtered ? `(${filtered.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          !filtered?.length ? <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                        {p.nome?.charAt(0)?.toUpperCase()}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      <Badge variant={p.perfil === 'admin' ? 'default' : 'secondary'}>
                        {getRoleLabel(p)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? 'default' : 'destructive'} className={p.ativo ? 'bg-success text-success-foreground' : ''}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          {editUser && <EditUserForm
            editUser={editUser}
            currentUserId={currentUser?.id}
            editNome={editNome} setEditNome={setEditNome}
            editRoleId={editRoleId} setEditRoleId={setEditRoleId}
            editAtivo={editAtivo} setEditAtivo={setEditAtivo}
            roles={roles}
            onResetPassword={handleResetPassword}
          />}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
