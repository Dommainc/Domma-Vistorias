import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Disponibilidade() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [empId, setEmpId] = useState("");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("17:00");
  const [intervalo, setIntervalo] = useState("60");
  const [vagas, setVagas] = useState("1");
  const [saving, setSaving] = useState(false);

  const { data: empreendimentos } = useQuery({
    queryKey: ['empreendimentos'],
    queryFn: async () => {
      const { data } = await supabase.from('empreendimentos').select('id, nome').eq('ativo', true).order('nome');
      return data || [];
    },
  });

  const { data: disponibilidades, isLoading } = useQuery({
    queryKey: ['disponibilidades'],
    queryFn: async () => {
      const { data, error } = await supabase.from('disponibilidade').select('*, empreendimentos(nome)').order('data', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const handleSave = async () => {
    if (!empId || !data || !horaInicio || !horaFim) { toast.error("Preencha todos os campos"); return; }
    setSaving(true);
    const { error } = await supabase.from('disponibilidade').insert({
      empreendimento_id: empId, data, hora_inicio: horaInicio, hora_fim: horaFim,
      intervalo_minutos: parseInt(intervalo), vagas_por_horario: parseInt(vagas),
    });
    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    queryClient.invalidateQueries({ queryKey: ['disponibilidades'] });
    toast.success("Disponibilidade criada!");
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('disponibilidade').delete().eq('id', id);
    if (error) { toast.error("Erro ao remover"); return; }
    queryClient.invalidateQueries({ queryKey: ['disponibilidades'] });
    toast.success("Removido!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Disponibilidade</h1>
          <p className="text-sm text-muted-foreground">Configure os horários disponíveis para agendamento</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova Disponibilidade</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Disponibilidade</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Empreendimento *</Label>
                <Select value={empId} onValueChange={setEmpId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{empreendimentos?.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Data *</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Hora Início</Label><Input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} /></div>
                <div className="space-y-2"><Label>Hora Fim</Label><Input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Intervalo (min)</Label><Input type="number" value={intervalo} onChange={e => setIntervalo(e.target.value)} /></div>
                <div className="space-y-2"><Label>Vagas por horário</Label><Input type="number" value={vagas} onChange={e => setVagas(e.target.value)} /></div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Disponibilidades</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          !disponibilidades?.length ? <p className="text-sm text-muted-foreground">Nenhuma disponibilidade configurada.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Empreendimento</TableHead><TableHead>Data</TableHead><TableHead>Horário</TableHead><TableHead>Intervalo</TableHead><TableHead>Vagas</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {disponibilidades.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>{(d as any).empreendimentos?.nome}</TableCell>
                    <TableCell>{format(new Date(d.data + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{d.hora_inicio} - {d.hora_fim}</TableCell>
                    <TableCell>{d.intervalo_minutos} min</TableCell>
                    <TableCell>{d.vagas_por_horario}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
