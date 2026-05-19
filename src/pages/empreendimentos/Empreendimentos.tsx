import { Building2, Plus, Pencil, Trash2, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Empreendimentos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; emp: any }>({ open: false, emp: null });
  const [confirmName, setConfirmName] = useState("");
  const [deleteInfo, setDeleteInfo] = useState<{ agendamentos: number; clientes: number; unidades: number }>({ agendamentos: 0, clientes: 0, unidades: 0 });

  const { data: empreendimentos, isLoading } = useQuery({
    queryKey: ['empreendimentos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empreendimentos').select('*').order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDeleteCheck = async (emp: any) => {
    // Check constraints
    const { data: unidades } = await supabase.from('unidades').select('id').eq('empreendimento_id', emp.id);
    const unitIds = unidades?.map(u => u.id) || [];

    let agCount = 0;
    let cliCount = 0;
    if (unitIds.length > 0) {
      const { count: ag } = await supabase.from('agendamentos').select('id', { count: 'exact', head: true })
        .in('unidade_id', unitIds).eq('status', 'vistoria_agendada');
      agCount = ag || 0;

      const { count: cli } = await supabase.from('clientes').select('id', { count: 'exact', head: true })
        .in('unidade_id', unitIds);
      cliCount = cli || 0;
    }

    setDeleteInfo({ agendamentos: agCount, clientes: cliCount, unidades: unitIds.length });
    setDeleteDialog({ open: true, emp });
    setConfirmName("");
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    const emp = deleteDialog.emp;
    if (!emp || confirmName !== emp.nome) return;

    try {
      // Delete unidades first (cascade will handle agendamentos etc.)
      const { error: unidadesError } = await supabase.from('unidades').delete().eq('empreendimento_id', emp.id);
      if (unidadesError) { toast.error("Erro ao excluir unidades: " + unidadesError.message); return; }

      const { error } = await supabase.from('empreendimentos').delete().eq('id', emp.id);
      if (error) { toast.error("Erro ao excluir empreendimento: " + error.message); return; }

      queryClient.invalidateQueries({ queryKey: ['empreendimentos'] });
      setDeleteDialog({ open: false, emp: null });
      toast.success("Empreendimento excluído com sucesso");
    } catch (err: any) {
      toast.error("Erro inesperado: " + err.message);
    }
  };

  const canDelete = deleteInfo.agendamentos === 0 && deleteInfo.clientes === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Empreendimentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os empreendimentos da construtora</p>
        </div>
        <Button onClick={() => navigate('/empreendimentos/novo')}>
          <Plus className="mr-2 h-4 w-4" /> Novo Empreendimento
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Lista de Empreendimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !empreendimentos?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum empreendimento cadastrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agendamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empreendimentos.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.nome}</TableCell>
                    <TableCell>{emp.cidade}</TableCell>
                    <TableCell>
                      <Badge variant={emp.ativo ? "default" : "secondary"}>
                        {emp.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={emp.aceita_agendamento ? "default" : "outline"} className={emp.aceita_agendamento ? "bg-success text-success-foreground" : ""}>
                        {emp.aceita_agendamento ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Mapa de Disponibilidade" onClick={() => navigate(`/mapa/${emp.id}`)}>
                          <Map className="h-4 w-4 text-green-700" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/empreendimentos/${emp.id}/editar`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCheck(emp)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => { if (!open) setDeleteDialog({ open: false, emp: null }); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Empreendimento</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deleteInfo.agendamentos > 0 && (
                  <p className="text-destructive font-medium">❌ Cancele todas as {deleteInfo.agendamentos} vistoria(s) agendada(s) antes de excluir.</p>
                )}
                {deleteInfo.clientes > 0 && (
                  <p className="text-destructive font-medium">❌ Remova todos os {deleteInfo.clientes} cliente(s) vinculado(s) antes de excluir.</p>
                )}
                {canDelete && deleteInfo.unidades > 0 && (
                  <p className="text-warning">⚠️ {deleteInfo.unidades} unidade(s) serão excluídas junto com o empreendimento.</p>
                )}
                {canDelete && (
                  <div className="space-y-2 pt-2">
                    <p className="text-sm">Digite <strong>{deleteDialog.emp?.nome}</strong> para confirmar:</p>
                    <Input value={confirmName} onChange={e => setConfirmName(e.target.value)} placeholder="Nome do empreendimento" />
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {canDelete && (
              <AlertDialogAction onClick={handleDelete} disabled={confirmName !== deleteDialog.emp?.nome}>
                Confirmar Exclusão
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
