import { Building2, Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Empreendimentos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
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

  const filtered = (empreendimentos ?? []).filter((e: any) =>
    e.nome?.toLowerCase().includes(search.toLowerCase()) ||
    e.cidade?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteCheck = async (emp: any) => {
    const { data: unidades } = await supabase.from('unidades').select('id').eq('empreendimento_id', emp.id);
    const unitIds = unidades?.map(u => u.id) || [];
    let agCount = 0, cliCount = 0;
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
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Empreendimentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie os empreendimentos da construtora</p>
        </div>
        <Button
          onClick={() => navigate('/empreendimentos/novo')}
          className="flex-shrink-0 shadow-sm"
          style={{ background: "linear-gradient(135deg, #1a2744 0%, #1e3a5f 100%)" }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Empreendimento
        </Button>
      </div>

      {/* Table card */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Lista de Empreendimentos
              {empreendimentos && (
                <Badge variant="secondary" className="font-normal text-xs">
                  {empreendimentos.length}
                </Badge>
              )}
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar empreendimento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Carregando...
              </div>
            </div>
          ) : !filtered.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {search ? "Nenhum resultado encontrado" : "Nenhum empreendimento cadastrado"}
              </p>
              {!search && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/empreendimentos/novo')}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Cadastrar agora
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cidade</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agendamento</TableHead>
                  <TableHead className="text-right pr-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp: any) => (
                  <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6 font-medium text-foreground">{emp.nome}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{emp.cidade || '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={emp.ativo ? "default" : "secondary"}
                        className={emp.ativo
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          : ""}
                      >
                        {emp.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={emp.aceita_agendamento ? "default" : "outline"}
                        className={emp.aceita_agendamento
                          ? "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"
                          : "text-muted-foreground"}
                      >
                        {emp.aceita_agendamento ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => navigate(`/empreendimentos/${emp.id}/editar`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/8"
                          onClick={() => handleDeleteCheck(emp)}
                        >
                          <Trash2 className="h-4 w-4" />
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
              <div className="space-y-3 text-sm">
                {deleteInfo.agendamentos > 0 && (
                  <p className="text-destructive font-medium">
                    ❌ Cancele as {deleteInfo.agendamentos} vistoria(s) agendada(s) antes de excluir.
                  </p>
                )}
                {deleteInfo.clientes > 0 && (
                  <p className="text-destructive font-medium">
                    ❌ Remova os {deleteInfo.clientes} cliente(s) vinculado(s) antes de excluir.
                  </p>
                )}
                {canDelete && deleteInfo.unidades > 0 && (
                  <p className="text-amber-600 font-medium">
                    ⚠️ {deleteInfo.unidades} unidade(s) serão excluídas junto.
                  </p>
                )}
                {canDelete && (
                  <div className="space-y-2 pt-2">
                    <p className="text-foreground">
                      Digite <strong>{deleteDialog.emp?.nome}</strong> para confirmar:
                    </p>
                    <Input
                      value={confirmName}
                      onChange={e => setConfirmName(e.target.value)}
                      placeholder="Nome do empreendimento"
                    />
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {canDelete && (
              <AlertDialogAction
                onClick={handleDelete}
                disabled={confirmName !== deleteDialog.emp?.nome}
                className="bg-destructive hover:bg-destructive/90"
              >
                Confirmar Exclusão
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
