import { DoorOpen, Eye, Trash2, Shield, ShieldOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { UnitStatusBadge } from "@/components/StatusBadge";
import { registrarHistorico } from "@/lib/historico";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function naturalSort(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export default function Unidades() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [filtroEmp, setFiltroEmp] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [busca, setBusca] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteResults, setDeleteResults] = useState<{ canDelete: any[]; cannotDelete: any[] }>({ canDelete: [], cannotDelete: [] });

  const { data: empreendimentos } = useQuery({
    queryKey: ['empreendimentos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empreendimentos').select('id, nome').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: unidades, isLoading } = useQuery({
    queryKey: ['unidades', filtroEmp],
    queryFn: async () => {
      let query = supabase.from('unidades').select('*, empreendimentos(nome), clientes(id, nome_completo)').order('bloco').order('numero');
      if (filtroEmp !== 'all') query = query.eq('empreendimento_id', filtroEmp);
      const { data, error } = await query;
      if (error) throw error;
      // Natural sort
      return (data || []).sort((a, b) => {
        const bc = naturalSort(a.bloco || '', b.bloco || '');
        if (bc !== 0) return bc;
        return naturalSort(a.numero, b.numero);
      });
    },
  });

  const filtered = unidades?.filter(u => {
    const matchBusca = !busca || u.numero.toLowerCase().includes(busca.toLowerCase()) || u.bloco?.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'all' || u.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const statusCounts = {
    all: unidades?.length || 0,
    aguardando_liberacao: unidades?.filter(u => u.status === 'aguardando_liberacao').length || 0,
    unidade_liberada: unidades?.filter(u => u.status === 'unidade_liberada').length || 0,
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!filtered) return;
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(u => u.id)));
    }
  };

  const handleBulkStatus = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    let success = 0;
    for (const uid of selectedIds) {
      const unit = unidades?.find(u => u.id === uid);
      if (!unit) continue;
      if (newStatus === 'aguardando_liberacao') {
        const { data: ag } = await supabase.from('agendamentos').select('id').eq('unidade_id', uid).in('status', ['aguardando_confirmacao', 'vistoria_agendada']).limit(1);
        if (ag && ag.length > 0) continue;
      }
      const { error } = await supabase.from('unidades').update({ status: newStatus }).eq('id', uid);
      if (!error) {
        await registrarHistorico({
          entidade_tipo: 'unidade', entidade_id: uid,
          status_anterior: unit.status, status_novo: newStatus,
          alterado_por_tipo: profile?.perfil as any, alterado_por_id: profile?.id, alterado_por_nome: profile?.nome,
        });
        success++;
      }
    }
    queryClient.invalidateQueries({ queryKey: ['unidades'] });
    setSelectedIds(new Set());
    toast.success(`${success} unidade(s) atualizadas`);
  };

  const handleBulkDeleteCheck = async () => {
    const canDelete: any[] = [];
    const cannotDelete: any[] = [];
    for (const uid of selectedIds) {
      const unit = unidades?.find(u => u.id === uid);
      if (!unit) continue;
      const { data: cli } = await supabase.from('clientes').select('id').eq('unidade_id', uid).limit(1);
      if (cli && cli.length > 0) { cannotDelete.push({ ...unit, motivo: 'Cliente vinculado' }); continue; }
      const { data: ag } = await supabase.from('agendamentos').select('id').eq('unidade_id', uid).in('status', ['aguardando_confirmacao', 'vistoria_agendada']).limit(1);
      if (ag && ag.length > 0) { cannotDelete.push({ ...unit, motivo: 'Agendamento ativo' }); continue; }
      canDelete.push(unit);
    }
    setDeleteResults({ canDelete, cannotDelete });
    setShowDeleteDialog(true);
  };

  const handleBulkDelete = async () => {
    let deleted = 0;
    for (const unit of deleteResults.canDelete) {
      const { error } = await supabase.from('unidades').delete().eq('id', unit.id);
      if (!error) deleted++;
    }
    queryClient.invalidateQueries({ queryKey: ['unidades'] });
    setSelectedIds(new Set());
    setShowDeleteDialog(false);
    toast.success(`${deleted} unidade(s) excluídas`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Unidades</h1>
        <p className="text-sm text-muted-foreground">Visualize todas as unidades dos empreendimentos</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'Todas', count: statusCounts.all },
          { value: 'aguardando_liberacao', label: 'Aguardando Liberação', count: statusCounts.aguardando_liberacao },
          { value: 'unidade_liberada', label: 'Unidades Liberadas', count: statusCounts.unidade_liberada },
        ].map(f => (
          <Button
            key={f.value}
            variant={filtroStatus === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroStatus(f.value)}
          >
            {f.label} ({f.count})
          </Button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={filtroEmp} onValueChange={setFiltroEmp}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Empreendimento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {empreendimentos?.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Buscar por número ou bloco..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-xs" />
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
          <span className="text-sm font-medium">{selectedIds.size} unidade(s) selecionadas</span>
          <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleBulkStatus('unidade_liberada')}>
            <Shield className="mr-1 h-3 w-3" /> Liberar
          </Button>
          <Button size="sm" variant="outline" className="border-warning text-warning" onClick={() => handleBulkStatus('aguardando_liberacao')}>
            <ShieldOff className="mr-1 h-3 w-3" /> Bloquear
          </Button>
          {profile?.perfil === 'admin' && (
            <Button size="sm" variant="destructive" onClick={handleBulkDeleteCheck}>
              <Trash2 className="mr-1 h-3 w-3" /> Excluir
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DoorOpen className="h-4 w-4" /> Unidades {filtered ? `(${filtered.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          !filtered?.length ? <p className="text-sm text-muted-foreground">Nenhuma unidade encontrada.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={filtered.length > 0 && selectedIds.size === filtered.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>Bloco</TableHead>
                  <TableHead>Nº</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(u => {
                  const cli = (u as any).clientes?.[0] || null;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Checkbox checked={selectedIds.has(u.id)} onCheckedChange={() => toggleSelect(u.id)} />
                      </TableCell>
                      <TableCell>{(u as any).empreendimentos?.nome}</TableCell>
                      <TableCell>{u.bloco || '-'}</TableCell>
                      <TableCell className="font-medium">{u.numero}</TableCell>
                      <TableCell>{u.tipo || '-'}</TableCell>
                      <TableCell><UnitStatusBadge status={u.status} /></TableCell>
                      <TableCell>
                        {cli ? (
                          <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate(`/clientes/${cli.id}`)}>
                            {cli.nome_completo}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/unidades/${u.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exclusão em Lote</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deleteResults.canDelete.length > 0 && (
                  <p className="text-sm text-success">{deleteResults.canDelete.length} unidade(s) serão excluídas</p>
                )}
                {deleteResults.cannotDelete.length > 0 && (
                  <div>
                    <p className="text-sm text-destructive font-medium">{deleteResults.cannotDelete.length} unidade(s) não podem ser excluídas:</p>
                    <ul className="text-xs mt-1 space-y-1">
                      {deleteResults.cannotDelete.map((u: any) => (
                        <li key={u.id}>• {u.numero} — {u.motivo}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {deleteResults.canDelete.length > 0 && (
              <AlertDialogAction onClick={handleBulkDelete}>
                Excluir apenas as {deleteResults.canDelete.length} disponíveis
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
