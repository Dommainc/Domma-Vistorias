import { UserCog, Plus, Pencil, KeyRound, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(b => chars[b % chars.length]).join('');
}

export default function Usuarios({ embedded }: { embedded?: boolean } = {}) {
  const { profile: currentProfile, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");

  // Create user dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPerfil, setNewPerfil] = useState<string>("vistoriador");
  const [newSenha, setNewSenha] = useState(generatePassword());
  const [creating, setCreating] = useState(false);

  // Edit user dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editNome, setEditNome] = useState("");
  const [editPerfil, setEditPerfil] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = profiles?.filter(p => {
    if (filtroPerfil !== 'all' && p.perfil !== filtroPerfil) return false;
    if (filtroStatus !== 'all' && String(p.ativo) !== filtroStatus) return false;
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase()) && !p.email.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!newNome.trim() || !newEmail.trim() || !newSenha) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          email: newEmail.trim(),
          password: newSenha,
          nome: newNome.trim(),
          perfil: newPerfil,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success("Usuário criado com sucesso!", {
        description: "Senha temporária: " + newSenha,
        action: { label: "Copiar Senha", onClick: () => navigator.clipboard.writeText(newSenha) },
        duration: 10000,
      });
      setCreateOpen(false);
      setNewNome(""); setNewEmail(""); setNewPerfil("vistoriador"); setNewSenha(generatePassword());
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    try {
      // Don't allow editing self
      if (editUser.id === currentUser?.id) {
        toast.error("Você não pode alterar seu próprio perfil"); return;
      }
      const { error } = await supabase.from('profiles').update({
        nome: editNome,
        perfil: editPerfil,
        ativo: editAtivo,
      }).eq('id', editUser.id);
      if (error) throw error;

      // If deactivating, ban the user
      if (!editAtivo && editUser.ativo) {
        await supabase.functions.invoke('manage-users', {
          body: { action: 'ban', user_id: editUser.id },
        });
      } else if (editAtivo && !editUser.ativo) {
        await supabase.functions.invoke('manage-users', {
          body: { action: 'unban', user_id: editUser.id },
        });
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
    setEditPerfil(p.perfil);
    setEditAtivo(p.ativo ?? true);
    setEditOpen(true);
  };

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
                <RadioGroup value={newPerfil} onValueChange={setNewPerfil} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="admin" id="r-admin" />
                    <Label htmlFor="r-admin">Admin</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="vistoriador" id="r-vist" />
                    <Label htmlFor="r-vist">Vistoriador</Label>
                  </div>
                </RadioGroup>
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
        <Select value={filtroPerfil} onValueChange={setFiltroPerfil}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Perfil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="vistoriador">Vistoriador</SelectItem>
          </SelectContent>
        </Select>
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
                        {p.perfil === 'admin' ? 'Admin' : 'Vistoriador'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? 'default' : 'destructive'} className={p.ativo ? 'bg-success text-success-foreground' : ''}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} disabled={p.id === currentUser?.id}>
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
          {editUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editNome} onChange={e => setEditNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <RadioGroup value={editPerfil} onValueChange={setEditPerfil} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="admin" id="e-admin" />
                    <Label htmlFor="e-admin">Admin</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="vistoriador" id="e-vist" />
                    <Label htmlFor="e-vist">Vistoriador</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editAtivo} onCheckedChange={setEditAtivo} />
                <Label>Ativo</Label>
              </div>
              <Button variant="outline" onClick={handleResetPassword}>
                <KeyRound className="mr-2 h-4 w-4" /> Redefinir Senha
              </Button>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
