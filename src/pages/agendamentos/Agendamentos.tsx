import { CalendarDays, List, Calendar as CalIcon, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { AgendamentoStatusBadge } from "@/components/StatusBadge";
import { registrarHistorico } from "@/lib/historico";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { formatDateTime, formatDate } from "@/lib/formatters";
import { formatCPF } from "@/lib/cpf";
import { HistoricoTimeline } from "@/components/HistoricoTimeline";

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales,
});

const EVENT_COLORS: Record<string, string> = {
  aguardando_confirmacao: 'hsl(45, 93%, 47%)',
  vistoria_agendada: 'hsl(210, 92%, 55%)',
  vistoria_concluida: 'hsl(142, 71%, 45%)',
  vistoria_cancelada: 'hsl(0, 72%, 51%)',
};

export default function Agendamentos() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(() =>
    (localStorage.getItem('agendamentos_view') as 'list' | 'calendar') || 'list'
  );
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; id: string; status: string; label: string }>({ open: false, id: '', status: '', label: '' });
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('agendamentos_view', viewMode); }, [viewMode]);

  const { data: agendamentos, isLoading, refetch } = useQuery({
    queryKey: ['agendamentos', filtroStatus],
    queryFn: async () => {
      let query = supabase.from('agendamentos')
        .select('*, clientes(nome_completo, email, cpf), unidades(numero, bloco, empreendimentos(nome))')
        .order('data_hora', { ascending: false });
      if (filtroStatus !== 'all') query = query.eq('status', filtroStatus);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('agendamentos-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agendamentos' }, () => {
        toast.info("Novo agendamento recebido!");
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const updateStatus = async (id: string, status: string, motivo?: string) => {
    const ag = agendamentos?.find(a => a.id === id);
    if (!ag) return;
    const updates: any = { status };
    if (status === 'vistoria_concluida') updates.realizado_em = new Date().toISOString();
    if (status === 'vistoria_agendada') updates.confirmado_em = new Date().toISOString();
    if (status === 'vistoria_cancelada') {
      updates.cancelado_em = new Date().toISOString();
      updates.cancelado_por_tipo = profile?.perfil || 'admin';
      if (motivo) updates.motivo_cancelamento = motivo;
    }
    const { error } = await supabase.from('agendamentos').update(updates).eq('id', id);
    if (error) { toast.error("Erro ao atualizar"); return; }

    await registrarHistorico({
      entidade_tipo: 'agendamento', entidade_id: id,
      status_anterior: ag.status, status_novo: status,
      alterado_por_tipo: profile?.perfil as any,
      alterado_por_id: profile?.id, alterado_por_nome: profile?.nome,
      motivo,
    });

    toast.success("Status atualizado!");
    refetch();
  };

  const handleCancelConfirm = () => {
    if (motivoCancelamento.length < 20) {
      toast.error("Motivo deve ter no mínimo 20 caracteres");
      return;
    }
    updateStatus(cancelDialog.id, 'vistoria_cancelada', motivoCancelamento);
    setCancelDialog({ open: false, id: '' });
    setMotivoCancelamento("");
  };

  const handleStatusSelect = (id: string, novoStatus: string) => {
    const ag = agendamentos?.find(a => a.id === id);
    if (!ag || ag.status === novoStatus) return;
    
    if (novoStatus === 'vistoria_cancelada') {
      setCancelDialog({ open: true, id });
      setMotivoCancelamento("");
      return;
    }
    
    if (novoStatus === 'vistoria_concluida') {
      setStatusDialog({ open: true, id, status: novoStatus, label: 'Marcar como Concluída' });
      return;
    }

    if (novoStatus === 'vistoria_agendada') {
      setStatusDialog({ open: true, id, status: novoStatus, label: 'Confirmar Agendamento' });
      return;
    }
  };

  const handleStatusConfirm = () => {
    updateStatus(statusDialog.id, statusDialog.status);
    setStatusDialog({ open: false, id: '', status: '', label: '' });
  };

  const handleDelete = async (id: string) => {
    const ag = agendamentos?.find(a => a.id === id);
    if (!ag) return;
    if (['aguardando_confirmacao', 'vistoria_agendada'].includes(ag.status || '')) {
      toast.error("Cancele o agendamento antes de excluir.");
      return;
    }
    if (!confirm("Confirmar exclusão do agendamento?")) return;
    const { error } = await supabase.from('agendamentos').delete().eq('id', id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Agendamento excluído");
    refetch();
  };

  const exportCSV = () => {
    if (!agendamentos?.length) return;
    const headers = "Cliente,Unidade,Empreendimento,Data/Hora,Status\n";
    const rows = agendamentos.map(a => {
      const cli = (a as any).clientes?.nome_completo || '';
      const uni = `${(a as any).unidades?.bloco || ''}${(a as any).unidades?.bloco ? '-' : ''}${(a as any).unidades?.numero || ''}`;
      const emp = (a as any).unidades?.empreendimentos?.nome || '';
      const dt = formatDateTime(a.data_hora);
      return `"${cli}","${uni}","${emp}","${dt}","${a.status}"`;
    }).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'agendamentos.csv'; a.click();
  };

  const calendarEvents = useMemo(() => {
    if (!agendamentos) return [];
    return agendamentos.map(a => ({
      id: a.id,
      title: `${(a as any).clientes?.nome_completo || 'Cliente'} - ${(a as any).unidades?.numero || ''}`,
      start: new Date(a.data_hora),
      end: new Date(new Date(a.data_hora).getTime() + 60 * 60 * 1000),
      status: a.status,
      resource: a,
    }));
  }, [agendamentos]);

  const eventStyleGetter = useCallback((event: any) => ({
    style: { backgroundColor: EVENT_COLORS[event.status] || '#888', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.75rem' },
  }), []);

  const canChangeStatus = profile?.perfil === 'admin' || profile?.perfil === 'vistoriador';
  const detailAg = detailId ? agendamentos?.find(a => a.id === detailId) : null;

  const isTerminal = (status: string | null) => ['vistoria_concluida', 'vistoria_cancelada'].includes(status || '');

  const renderStatusSelect = (ag: any) => {
    if (isTerminal(ag.status)) return <span className="text-xs text-muted-foreground italic">Status terminal</span>;
    
    if (ag.status === 'aguardando_confirmacao') {
      return (
        <Select value={ag.status || ''} onValueChange={(v) => handleStatusSelect(ag.id, v)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="aguardando_confirmacao">⏳ Aguardando Confirmação</SelectItem>
            <SelectItem value="vistoria_agendada">📅 Confirmar Agendamento</SelectItem>
            <SelectItem value="vistoria_cancelada">❌ Cancelar Vistoria</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (ag.status === 'vistoria_agendada') {
      return (
        <Select value={ag.status || ''} onValueChange={(v) => handleStatusSelect(ag.id, v)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="vistoria_agendada">📅 Vistoria Agendada</SelectItem>
            <SelectItem value="vistoria_concluida">✅ Marcar como Concluída</SelectItem>
            <SelectItem value="vistoria_cancelada">❌ Cancelar Vistoria</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie todos os agendamentos de vistoria</p>
        </div>
        <div className="flex gap-2">
          {profile?.perfil === 'admin' && (
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="mr-1 h-4 w-4" /> Exportar CSV
            </Button>
          )}
          <div className="flex border rounded-md">
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'calendar' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('calendar')}>
              <CalIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Select value={filtroStatus} onValueChange={setFiltroStatus}>
        <SelectTrigger className="w-[220px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="aguardando_confirmacao">Aguardando Confirmação</SelectItem>
          <SelectItem value="vistoria_agendada">Vistoria Agendada</SelectItem>
          <SelectItem value="vistoria_concluida">Vistoria Concluída</SelectItem>
          <SelectItem value="vistoria_cancelada">Vistoria Cancelada</SelectItem>
        </SelectContent>
      </Select>

      {viewMode === 'calendar' ? (
        <Card>
          <CardContent className="pt-6">
            <div style={{ height: 600 }}>
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                eventPropGetter={eventStyleGetter}
                onSelectEvent={(event: any) => setDetailId(event.id)}
                views={['month', 'week', 'day']}
                messages={{
                  today: 'Hoje', previous: 'Anterior', next: 'Próximo',
                  month: 'Mês', week: 'Semana', day: 'Dia',
                  noEventsInRange: 'Nenhum agendamento neste período.',
                }}
                culture="pt-BR"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Agendamentos {agendamentos ? `(${agendamentos.length})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
            !agendamentos?.length ? <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado.</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    {canChangeStatus && <TableHead>Alterar Status</TableHead>}
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agendamentos.map(a => (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setDetailId(a.id)}
                    >
                      <TableCell className="font-medium">{(a as any).clientes?.nome_completo}</TableCell>
                      <TableCell>
                        {(a as any).unidades?.empreendimentos?.nome} - {(a as any).unidades?.bloco ? (a as any).unidades.bloco + '-' : ''}{(a as any).unidades?.numero}
                      </TableCell>
                      <TableCell>{formatDateTime(a.data_hora)}</TableCell>
                      <TableCell><AgendamentoStatusBadge status={a.status} /></TableCell>
                      {canChangeStatus && (
                        <TableCell onClick={e => e.stopPropagation()}>
                          {renderStatusSelect(a)}
                        </TableCell>
                      )}
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        {isTerminal(a.status) && canChangeStatus && (
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)}>
                            Excluir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail Drawer */}
      <Sheet open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Detalhe do Agendamento</SheetTitle>
          </SheetHeader>
          {detailAg && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <AgendamentoStatusBadge status={detailAg.status} />
                <span className="text-sm font-medium">{formatDateTime(detailAg.data_hora)}</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Cliente</p>
                <p className="text-sm font-medium">{(detailAg as any).clientes?.nome_completo}</p>
                <p className="text-xs text-muted-foreground">CPF: {formatCPF((detailAg as any).clientes?.cpf || '')}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Unidade</p>
                <p className="text-sm">{(detailAg as any).unidades?.empreendimentos?.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {(detailAg as any).unidades?.bloco ? `Bloco ${(detailAg as any).unidades.bloco} — ` : ''}Apto {(detailAg as any).unidades?.numero}
                </p>
              </div>

              {detailAg.observacoes && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Observações do Cliente</p>
                  <p className="text-sm">{detailAg.observacoes}</p>
                </div>
              )}

              {detailAg.status === 'vistoria_cancelada' && detailAg.motivo_cancelamento && canChangeStatus && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Motivo de Cancelamento</p>
                  <p className="text-sm">{detailAg.motivo_cancelamento}</p>
                </div>
              )}

              <HistoricoTimeline entidadeTipo="agendamento" entidadeId={detailAg.id} />

              {canChangeStatus && !isTerminal(detailAg.status) && (
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Ações</p>
                  <div onClick={e => e.stopPropagation()}>
                    {renderStatusSelect(detailAg)}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Cancel dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => { if (!open) setCancelDialog({ open: false, id: '' }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar Agendamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Motivo do cancelamento *</Label>
              <Textarea
                value={motivoCancelamento}
                onChange={e => setMotivoCancelamento(e.target.value)}
                placeholder="Informe o motivo do cancelamento (mínimo 20 caracteres)"
                minLength={20}
              />
              <p className="text-xs text-muted-foreground">{motivoCancelamento.length}/20 caracteres mínimos</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Voltar</Button></DialogClose>
            <Button variant="destructive" onClick={handleCancelConfirm} disabled={motivoCancelamento.length < 20}>
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status confirmation dialog */}
      <Dialog open={statusDialog.open} onOpenChange={(open) => { if (!open) setStatusDialog({ open: false, id: '', status: '', label: '' }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{statusDialog.label}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Confirmar esta ação?</p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleStatusConfirm}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
