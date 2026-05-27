import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, Link2Off, Shield, ShieldOff, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { UnitStatusBadge } from "@/components/StatusBadge";
import { HistoricoTimeline } from "@/components/HistoricoTimeline";
import { registrarHistorico } from "@/lib/historico";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";

const DIAS_SEMANA = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

export default function UnidadeDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { guardAction } = usePermission();
  const queryClient = useQueryClient();

  const [dispAtiva, setDispAtiva] = useState(false);
  const [dispDataInicio, setDispDataInicio] = useState("");
  const [dispDataFim, setDispDataFim] = useState("");
  const [dispHoraInicio, setDispHoraInicio] = useState("08:00");
  const [dispHoraFim, setDispHoraFim] = useState("17:00");
  const [dispDias, setDispDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [savingDisp, setSavingDisp] = useState(false);
  const [dispLoaded, setDispLoaded] = useState(false);

  const { data: unidade, refetch: refetchUnidade } = useQuery({
    queryKey: ['unidade', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('unidades').select('*, empreendimentos(nome)').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (unidade && !dispLoaded) {
      setDispAtiva((unidade as any).disponibilidade_ativa ?? false);
      setDispDataInicio((unidade as any).disponibilidade_data_inicio ?? "");
      setDispDataFim((unidade as any).disponibilidade_data_fim ?? "");
      setDispHoraInicio((unidade as any).disponibilidade_hora_inicio?.substring(0, 5) ?? "08:00");
      setDispHoraFim((unidade as any).disponibilidade_hora_fim?.substring(0, 5) ?? "17:00");
      setDispDias((unidade as any).disponibilidade_dias_semana ?? [1, 2, 3, 4, 5]);
      setDispLoaded(true);
    }
  }, [unidade, dispLoaded]);

  const { data: cliente } = useQuery({
    queryKey: ['cliente-unidade', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*').eq('unidade_id', id!).limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  const { data: agendamentoAtivo } = useQuery({
    queryKey: ['agendamento-ativo-unidade', id],
    queryFn: async () => {
      const { data } = await supabase.from('agendamentos').select('id')
        .eq('unidade_id', id!).eq('status', 'vistoria_agendada').limit(1);
      return data?.[0] || null;
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    if (!unidade || !profile) return;
    if (newStatus === 'aguardando_liberacao' && agendamentoAtivo) {
      toast.error("Existe uma vistoria agendada para esta unidade. Cancele-a antes de bloquear.");
      return;
    }
    const { error } = await supabase.from('unidades').update({ status: newStatus }).eq('id', id!);
    if (error) { toast.error("Erro ao alterar status"); return; }

    await registrarHistorico({
      entidade_tipo: 'unidade',
      entidade_id: id!,
      status_anterior: unidade.status,
      status_novo: newStatus,
      alterado_por_tipo: profile.perfil as 'admin' | 'vistoriador',
      alterado_por_id: profile.id,
      alterado_por_nome: profile.nome,
    });

    queryClient.invalidateQueries({ queryKey: ['unidade', id] });
    queryClient.invalidateQueries({ queryKey: ['historico', 'unidade', id] });
    toast.success("Status atualizado!");
  };

  const handleDesvincular = async () => {
    if (!cliente) return;
    if (agendamentoAtivo) {
      toast.error("Cancele a vistoria agendada antes de desvincular o cliente.");
      return;
    }
    const { error } = await supabase.from('clientes').delete().eq('id', cliente.id);
    if (error) { toast.error("Erro ao desvincular"); return; }
    await supabase.from('unidades').update({ status: 'aguardando_liberacao' } as any).eq('id', id!);
    if (profile) {
      await registrarHistorico({
        entidade_tipo: 'unidade',
        entidade_id: id!,
        status_anterior: unidade?.status,
        status_novo: 'aguardando_liberacao',
        alterado_por_tipo: profile.perfil as 'admin' | 'vistoriador',
        alterado_por_id: profile.id,
        alterado_por_nome: profile.nome,
        motivo: `Cliente ${cliente.nome_completo} desvinculado`,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['cliente-unidade', id] });
    queryClient.invalidateQueries({ queryKey: ['unidade', id] });
    toast.success("Cliente desvinculado com sucesso");
  };

  const handleSaveDisponibilidade = async () => {
    setSavingDisp(true);
    const prevAtiva = (unidade as any)?.disponibilidade_ativa ?? false;
    const { error } = await supabase.from('unidades').update({
      disponibilidade_ativa: dispAtiva,
      disponibilidade_data_inicio: dispDataInicio || null,
      disponibilidade_data_fim: dispDataFim || null,
      disponibilidade_hora_inicio: dispHoraInicio || null,
      disponibilidade_hora_fim: dispHoraFim || null,
      disponibilidade_dias_semana: dispDias,
    } as any).eq('id', id!);
    setSavingDisp(false);
    if (error) { toast.error("Erro ao salvar disponibilidade"); return; }

    if (prevAtiva !== dispAtiva && profile) {
      await registrarHistorico({
        entidade_tipo: 'unidade',
        entidade_id: id!,
        status_anterior: prevAtiva ? 'disponibilidade_ativa' : 'disponibilidade_inativa',
        status_novo: dispAtiva ? 'disponibilidade_ativa' : 'disponibilidade_inativa',
        alterado_por_tipo: profile.perfil as 'admin' | 'vistoriador',
        alterado_por_id: profile.id,
        alterado_por_nome: profile.nome,
      });
    }

    refetchUnidade();
    toast.success("Disponibilidade salva!");
  };

  if (!unidade) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/unidades')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">Unidade {unidade.numero}</h1>
          <p className="text-sm text-muted-foreground">{(unidade as any).empreendimentos?.nome}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados da Unidade</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Bloco:</span><span>{unidade.bloco || '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Andar:</span><span>{unidade.andar || '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Número:</span><span className="font-medium">{unidade.numero}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><span>{unidade.tipo || '-'}</span></div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status:</span>
            <UnitStatusBadge status={unidade.status} />
          </div>

          <PermissionGuard permissionKey="UNIDADES_CHANGE_STATUS" context="section">
            <div className="pt-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Alterar Status da Unidade</Label>
                <Select
                  value={unidade.status || 'aguardando_liberacao'}
                  onValueChange={(novoStatus) => {
                    if (novoStatus !== unidade.status) {
                      guardAction('UNIDADES_CHANGE_STATUS', () => handleStatusChange(novoStatus))();
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando_liberacao">⏳ Aguardando Liberação</SelectItem>
                    <SelectItem value="unidade_liberada">✅ Unidade Liberada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                {unidade.status === 'aguardando_liberacao' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground">
                        <Shield className="mr-1 h-3 w-3" /> Liberar Unidade
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Liberação</AlertDialogTitle>
                        <AlertDialogDescription>Deseja liberar esta unidade para agendamento?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleStatusChange('unidade_liberada')}>Confirmar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {unidade.status === 'unidade_liberada' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="border-warning text-warning">
                        <ShieldOff className="mr-1 h-3 w-3" /> Bloquear Unidade
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Bloqueio</AlertDialogTitle>
                        <AlertDialogDescription>Deseja bloquear esta unidade? Ela voltará para "Aguardando Liberação".</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleStatusChange('aguardando_liberacao')}>Confirmar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </PermissionGuard>
        </CardContent>
      </Card>

      <PermissionGuard permissionKey="UNIDADES_CHANGE_STATUS" context="section">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Disponibilidade para Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Aceita agendamentos</Label>
              <Switch checked={dispAtiva} onCheckedChange={setDispAtiva} />
            </div>
            <div className={!dispAtiva ? 'opacity-50 pointer-events-none' : ''}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Período - De:</Label>
                  <Input type="date" value={dispDataInicio} onChange={e => setDispDataInicio(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Período - Até:</Label>
                  <Input type="date" value={dispDataFim} onChange={e => setDispDataFim(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 mt-3">
                <div className="space-y-2">
                  <Label>Horário - Das:</Label>
                  <Input type="time" value={dispHoraInicio} onChange={e => setDispHoraInicio(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Horário - Às:</Label>
                  <Input type="time" value={dispHoraFim} onChange={e => setDispHoraFim(e.target.value)} />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <Label>Dias da semana disponíveis:</Label>
                <div className="flex flex-wrap gap-3">
                  {DIAS_SEMANA.map(d => (
                    <label key={d.value} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={dispDias.includes(d.value)}
                        onCheckedChange={(checked) => {
                          setDispDias(prev => checked
                            ? [...prev, d.value]
                            : prev.filter(v => v !== d.value)
                          );
                        }}
                      />
                      {d.label}
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ℹ️ O intervalo entre horários é definido pelo tempo médio de vistoria nas Configurações do sistema.
              </p>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSaveDisponibilidade} disabled={savingDisp}>
                {savingDisp ? "Salvando..." : "Salvar Disponibilidade"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PermissionGuard>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Cliente Vinculado</CardTitle></CardHeader>
        <CardContent>
          {cliente ? (
            <div className="space-y-3">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Nome:</span><span className="font-medium">{cliente.nome_completo}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">E-mail:</span><span>{cliente.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CPF:</span><span>{cliente.cpf}</span></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/clientes/${cliente.id}`)}>Ver Cliente</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm"><Link2Off className="mr-1 h-3 w-3" /> Desvincular</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar desvinculação</AlertDialogTitle>
                      <AlertDialogDescription>
                        {agendamentoAtivo
                          ? "Cancele a vistoria agendada antes de desvincular o cliente."
                          : `Desvincular ${cliente.nome_completo} da unidade ${unidade.numero}? O cliente continuará cadastrado no sistema mas sem unidade vinculada.`
                        }
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      {!agendamentoAtivo && (
                        <AlertDialogAction onClick={guardAction('UNIDADES_CHANGE_STATUS', handleDesvincular)}>
                          Confirmar
                        </AlertDialogAction>
                      )}
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Nenhum cliente vinculado a esta unidade.</p>
              <Button size="sm" onClick={() => navigate(`/clientes/novo?unidade_id=${id}`)}>Vincular Cliente</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <HistoricoTimeline entidadeTipo="unidade" entidadeId={id!} />
    </div>
  );
}
