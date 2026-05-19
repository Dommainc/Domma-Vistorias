import { useState } from "react";
import { useConfiguracoes, useUpdateConfiguracao } from "@/hooks/useConfiguracoes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings, Clock } from "lucide-react";
import { toast } from "sonner";

export default function ConfiguracoesAgendamento() {
  const { data: configs, isLoading } = useConfiguracoes();
  const updateConfig = useUpdateConfiguracao();

  const getVal = (chave: string) => configs?.find(c => c.chave === chave)?.valor || '';

  const [prazoMinimo, setPrazoMinimo] = useState('');
  const [prazoMaximo, setPrazoMaximo] = useState('');
  const [permiteCancelamento, setPermiteCancelamento] = useState(false);
  const [tempoMedio, setTempoMedio] = useState('');
  const [antecedenciaMinDias, setAntecedenciaMinDias] = useState('');
  const [cancelamentoHoras, setCancelamentoHoras] = useState('');
  const [loaded, setLoaded] = useState(false);

  if (configs && !loaded) {
    setPrazoMinimo(getVal('agendamento_prazo_minimo_horas') || '24');
    setPrazoMaximo(getVal('agendamento_prazo_maximo_dias') || '60');
    setPermiteCancelamento(getVal('agendamento_permite_cancelamento_cliente') === 'true');
    setTempoMedio(getVal('tempo_medio_vistoria_minutos') || '60');
    setAntecedenciaMinDias(getVal('agendamento_antecedencia_minima_dias') || '7');
    setCancelamentoHoras(getVal('agendamento_cancelamento_antecedencia_horas') || '24');
    setLoaded(true);
  }

  const handleSave = async () => {
    try {
      await Promise.all([
        updateConfig.mutateAsync({ chave: 'agendamento_prazo_minimo_horas', valor: prazoMinimo }),
        updateConfig.mutateAsync({ chave: 'agendamento_prazo_maximo_dias', valor: prazoMaximo }),
        updateConfig.mutateAsync({ chave: 'agendamento_permite_cancelamento_cliente', valor: String(permiteCancelamento) }),
        updateConfig.mutateAsync({ chave: 'tempo_medio_vistoria_minutos', valor: tempoMedio }),
        updateConfig.mutateAsync({ chave: 'agendamento_antecedencia_minima_dias', valor: antecedenciaMinDias }),
        updateConfig.mutateAsync({ chave: 'agendamento_cancelamento_antecedencia_horas', valor: cancelamentoHoras }),
      ]);
      toast.success("Configurações salvas!");
    } catch {
      toast.error("Erro ao salvar configurações");
    }
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold">Configurações de Agendamento</h1>
        <p className="text-sm text-muted-foreground">Defina o comportamento padrão dos agendamentos</p>
      </div>

      {/* Tempo médio de vistoria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Duração da Vistoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tempo médio por vistoria (minutos)</Label>
            <Input
              type="number"
              value={tempoMedio}
              onChange={e => setTempoMedio(e.target.value)}
              min="15"
              max="480"
            />
            <p className="text-xs text-muted-foreground">
              ℹ️ Este valor define o intervalo entre horários disponíveis no calendário de agendamento.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Antecedência mínima para agendar (dias)</Label>
            <Input type="number" value={antecedenciaMinDias} onChange={e => setAntecedenciaMinDias(e.target.value)} min="0" />
          </div>
          <div className="space-y-2">
            <Label>Antecedência mínima para cancelamento pelo cliente (horas)</Label>
            <Input type="number" value={cancelamentoHoras} onChange={e => setCancelamentoHoras(e.target.value)} min="0" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Comportamento Padrão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label>Permitir cancelamento pelo cliente</Label>
            <Switch checked={permiteCancelamento} onCheckedChange={setPermiteCancelamento} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Prazo mínimo para agendamento (horas)</Label>
              <Input type="number" value={prazoMinimo} onChange={e => setPrazoMinimo(e.target.value)} min="0" />
            </div>
            <div className="space-y-2">
              <Label>Prazo máximo para agendamento (dias)</Label>
              <Input type="number" value={prazoMaximo} onChange={e => setPrazoMaximo(e.target.value)} min="1" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
