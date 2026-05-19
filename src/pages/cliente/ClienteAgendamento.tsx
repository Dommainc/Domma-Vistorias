import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClienteAuth } from "@/hooks/useClienteAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, startOfDay, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { maskCPF } from "@/lib/cpf";
import { formatDateTime, formatDateLong } from "@/lib/formatters";
import { AgendamentoStatusBadge } from "@/components/StatusBadge";

interface SlotInfo { hora: string; disponivel: boolean }

type Step = 'dados' | 'data' | 'horario' | 'confirmar' | 'sucesso';

export default function ClienteAgendamento() {
  const { session } = useClienteAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('dados');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const { data: cliente } = useQuery({
    queryKey: ['portal-ag-cliente', session?.cliente_id],
    queryFn: async () => {
      const { data } = await supabase.from('clientes')
        .select('*, unidades(*, empreendimentos(nome))')
        .eq('id', session!.cliente_id).single();
      return data;
    },
    enabled: !!session?.cliente_id,
  });

  const { data: agendamentos } = useQuery({
    queryKey: ['portal-ag-agendamentos', session?.cliente_id],
    queryFn: async () => {
      const { data } = await supabase.from('agendamentos')
        .select('*')
        .eq('cliente_id', session!.cliente_id);
      return data || [];
    },
    enabled: !!session?.cliente_id,
  });

  const { data: configs } = useQuery({
    queryKey: ['portal-configs'],
    queryFn: async () => {
      const { data } = await supabase.from('configuracoes').select('chave, valor');
      return data || [];
    },
  });

  const antecedenciaDias = useMemo(() => {
    const c = configs?.find((c: any) => c.chave === 'agendamento_antecedencia_minima_dias');
    return parseInt(c?.valor || '7');
  }, [configs]);

  const prazoMaxDias = useMemo(() => {
    const c = configs?.find((c: any) => c.chave === 'agendamento_prazo_maximo_dias');
    return parseInt(c?.valor || '60');
  }, [configs]);

  const unidade = (cliente as any)?.unidades;

  const temAgendamentoAtivo = agendamentos?.some(ag =>
    ['aguardando_confirmacao', 'vistoria_agendada'].includes(ag.status || '')
  );

  // Load slots when date selected
  useEffect(() => {
    if (!selectedDate || !unidade) return;
    setSelectedSlot(null);
    setLoadingSlots(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    supabase.functions.invoke('get-available-slots', {
      body: { unidade_id: unidade.id, data: dateStr },
    }).then(({ data }) => {
      setSlots(data?.slots || []);
      setLoadingSlots(false);
    }).catch(() => {
      setSlots([]);
      setLoadingSlots(false);
    });
  }, [selectedDate, unidade]);

  const disabledDates = (date: Date) => {
    const today = startOfDay(new Date());
    const minDate = addDays(today, antecedenciaDias);
    const maxDate = addDays(today, prazoMaxDias);
    if (isBefore(date, minDate) || isAfter(date, maxDate)) return true;
    if (unidade?.disponibilidade_dias_semana) {
      const dow = date.getDay();
      if (!unidade.disponibilidade_dias_semana.includes(dow)) return true;
    }
    if (unidade?.disponibilidade_data_inicio) {
      if (isBefore(date, new Date(unidade.disponibilidade_data_inicio + 'T00:00:00'))) return true;
    }
    if (unidade?.disponibilidade_data_fim) {
      if (isAfter(date, new Date(unidade.disponibilidade_data_fim + 'T23:59:59'))) return true;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot || !cliente || !unidade) return;
    setSubmitting(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dataHora = `${dateStr}T${selectedSlot}:00`;

    try {
      // Check duplicate
      const { data: existing } = await supabase.from('agendamentos')
        .select('id, status').eq('unidade_id', unidade.id)
        .in('status', ['aguardando_confirmacao', 'vistoria_agendada']).limit(1);
      if (existing && existing.length > 0) {
        toast.error("Você já possui uma vistoria em andamento para esta unidade.");
        setSubmitting(false); return;
      }

      // Race condition check
      const { count } = await supabase.from('agendamentos')
        .select('id', { count: 'exact', head: true })
        .eq('unidade_id', unidade.id).eq('data_hora', dataHora)
        .in('status', ['aguardando_confirmacao', 'vistoria_agendada']);
      if ((count || 0) >= 1) {
        toast.error("Este horário acabou de ser ocupado. Escolha outro.");
        setSubmitting(false); return;
      }

      const { data: agIns, error } = await supabase.from('agendamentos').insert({
        cliente_id: cliente.id, unidade_id: unidade.id,
        data_hora: dataHora, status: 'aguardando_confirmacao',
        observacoes: observacoes || null,
      }).select('id').single();
      if (error) throw error;

      // Register in historico
      await supabase.from('historico_status').insert({
        entidade_tipo: 'agendamento',
        entidade_id: agIns.id,
        status_anterior: null,
        status_novo: 'aguardando_confirmacao',
        alterado_por_tipo: 'cliente',
        alterado_por_id: cliente.id,
        alterado_por_nome: cliente.nome_completo,
      });

      setStep('sucesso');
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar");
    } finally {
      setSubmitting(false);
    }
  };

  if (!cliente) return <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  if (unidade?.status !== 'unidade_liberada') {
    return (
      <Card className="mt-4">
        <CardContent className="pt-6 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 mx-auto text-warning" />
          <p className="text-sm">Unidade aguardando liberação. Favor tentar novamente posteriormente.</p>
        </CardContent>
      </Card>
    );
  }

  if (!unidade?.disponibilidade_ativa) {
    return (
      <Card className="mt-4">
        <CardContent className="pt-6 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 mx-auto text-warning" />
          <p className="text-sm">Esta unidade não está disponível para agendamento no momento.</p>
        </CardContent>
      </Card>
    );
  }

  // Block if active agendamento exists
  if (temAgendamentoAtivo) {
    const ativo = agendamentos?.find(a => ['aguardando_confirmacao', 'vistoria_agendada'].includes(a.status || ''));
    return (
      <Card className="mt-4">
        <CardContent className="pt-6 space-y-3 text-center">
          <p className="text-sm font-medium">Você já possui uma vistoria em andamento.</p>
          {ativo && <AgendamentoStatusBadge status={ativo.status} />}
          <p className="text-sm text-muted-foreground">Cancele o agendamento atual ou aguarde sua conclusão para agendar novamente.</p>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate('/cliente/historico')}>
            Ver meu agendamento
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Stepper progress
  const steps: { key: Step; label: string }[] = [
    { key: 'dados', label: 'Dados' },
    { key: 'data', label: 'Data' },
    { key: 'horario', label: 'Horário' },
    { key: 'confirmar', label: 'Confirmar' },
  ];

  const stepIndex = steps.findIndex(s => s.key === step);

  if (step === 'sucesso') {
    return (
      <Card>
        <CardContent className="pt-8 text-center space-y-4 pb-8">
          <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <h2 className="font-heading text-xl font-bold">Vistoria agendada!</h2>
          <div className="text-sm space-y-1">
            <p>{formatDateTime(`${format(selectedDate!, 'yyyy-MM-dd')}T${selectedSlot}:00`)}</p>
            <p>{unidade?.empreendimentos?.nome} — {unidade?.bloco ? `Bloco ${unidade.bloco} • ` : ''}Apto {unidade?.numero}</p>
          </div>
          <p className="text-xs text-muted-foreground">Aguarde a confirmação do seu agendamento.</p>
          <Button className="w-full h-12 rounded-xl" onClick={() => navigate('/cliente/historico')}>
            Ver Meus Agendamentos
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-lg font-bold">Agendar Vistoria</h1>

      {/* Stepper */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1">
            <div className={cn(
              "h-1.5 rounded-full flex-1 transition-colors",
              i <= stepIndex ? "bg-primary" : "bg-muted"
            )} />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Etapa {stepIndex + 1} de {steps.length}: {steps[stepIndex].label}</p>

      {/* Step: Dados */}
      {step === 'dados' && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <p className="text-sm font-medium">Confirme seus dados</p>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Nome:</span><span>{cliente.nome_completo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CPF:</span><span>{maskCPF(cliente.cpf)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Unidade:</span><span>{unidade?.bloco ? `${unidade.bloco}-` : ''}{unidade?.numero}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Empreendimento:</span><span>{unidade?.empreendimentos?.nome}</span></div>
            </div>
            <Button className="w-full h-12 rounded-xl" onClick={() => setStep('data')}>
              Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Data */}
      {step === 'data' && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm font-medium">Escolha uma data</p>
            <Calendar
              mode="single" selected={selectedDate}
              onSelect={(d) => { setSelectedDate(d); }}
              disabled={disabledDates} locale={ptBR}
              className={cn("p-3 pointer-events-auto rounded-md border mx-auto")}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setStep('dados')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button className="flex-1 h-11 rounded-xl" disabled={!selectedDate} onClick={() => setStep('horario')}>
                Continuar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Horário */}
      {step === 'horario' && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm font-medium">
              Horários para {selectedDate ? formatDateLong(selectedDate) : ''}
            </p>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum horário disponível para esta data.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map(s => (
                  <Button
                    key={s.hora}
                    variant={selectedSlot === s.hora ? "default" : "outline"}
                    size="sm"
                    disabled={!s.disponivel}
                    onClick={() => setSelectedSlot(s.hora)}
                    className={cn(
                      "h-11 rounded-xl text-sm",
                      !s.disponivel && "opacity-40",
                      selectedSlot === s.hora && "ring-2 ring-primary"
                    )}
                  >
                    {s.hora}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setStep('data')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button className="flex-1 h-11 rounded-xl" disabled={!selectedSlot} onClick={() => setStep('confirmar')}>
                Continuar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Confirmar */}
      {step === 'confirmar' && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm font-medium">Confirme o agendamento</p>
            <div className="bg-muted rounded-xl p-4 text-sm space-y-1">
              <p>📅 {selectedDate ? formatDateLong(selectedDate) : ''}</p>
              <p>🕐 {selectedSlot}</p>
              <p>🏢 {unidade?.empreendimentos?.nome}</p>
              <p>🏠 {unidade?.bloco ? `Bloco ${unidade.bloco} • ` : ''}Apto {unidade?.numero}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value.slice(0, 500))}
                maxLength={500}
                placeholder="Alguma observação?"
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setStep('horario')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button className="flex-1 h-12 rounded-xl text-base" disabled={submitting} onClick={handleSubmit}>
                {submitting ? "Agendando..." : "Confirmar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
