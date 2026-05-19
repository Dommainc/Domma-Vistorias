import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatCPF, validateCPF, formatPhone } from "@/lib/cpf";

const TIPOS_DOC = ["RG", "CPF", "CNH", "Procuração", "Contrato", "Comprovante de Residência", "Outros"];

function naturalSort(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export default function ClienteForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedUnidade = searchParams.get('unidade_id');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [empId, setEmpId] = useState("");
  const [unidadeId, setUnidadeId] = useState(preselectedUnidade || "");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [docs, setDocs] = useState<{ file: File; tipo: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: empreendimentos } = useQuery({
    queryKey: ['empreendimentos'],
    queryFn: async () => {
      const { data } = await supabase.from('empreendimentos').select('id, nome').eq('ativo', true).order('nome');
      return data || [];
    },
  });

  const { data: unidadesDisponiveis } = useQuery({
    queryKey: ['unidades-disponiveis', empId],
    queryFn: async () => {
      if (!empId) return [];
      const { data: unidades } = await supabase.from('unidades').select('id, numero, bloco, andar, tipo')
        .eq('empreendimento_id', empId).order('bloco').order('numero');
      if (!unidades) return [];
      const ids = unidades.map(u => u.id);
      const { data: occupied } = await supabase.from('clientes').select('unidade_id').in('unidade_id', ids);
      const occupiedIds = new Set(occupied?.map(c => c.unidade_id));
      return unidades
        .filter(u => !occupiedIds.has(u.id))
        .sort((a, b) => {
          const bc = naturalSort(a.bloco || '', b.bloco || '');
          if (bc !== 0) return bc;
          return naturalSort(a.numero, b.numero);
        });
    },
    enabled: !!empId,
  });

  const handleSave = async () => {
    if (!unidadeId || !nome.trim() || !cpf || !dataNascimento || !email) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    const cpfDigits = cpf.replace(/\D/g, '');
    if (!validateCPF(cpfDigits)) { toast.error("CPF inválido"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { toast.error("E-mail inválido"); return; }

    // Check duplicate CPF
    const { data: existingCpf } = await supabase.from('clientes').select('id, nome_completo').eq('cpf', cpfDigits).limit(1);
    if (existingCpf && existingCpf.length > 0) {
      toast.error(`Este CPF já está cadastrado no sistema para o cliente "${existingCpf[0].nome_completo}".`);
      return;
    }

    setSaving(true);
    try {
      const { data: cliente, error } = await supabase.from('clientes').insert({
        unidade_id: unidadeId,
        nome_completo: nome.trim(),
        cpf: cpfDigits,
        data_nascimento: dataNascimento,
        email: email.trim(),
        telefone: telefone.replace(/\D/g, '') || null,
        criado_por: user?.id,
      }).select('id').single();
      if (error) throw error;

      for (const doc of docs) {
        const ext = doc.file.name.split('.').pop();
        const path = `${cliente.id}/${doc.tipo}_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('documentos-clientes').upload(path, doc.file);
        if (upErr) continue;
        const { data: urlData } = supabase.storage.from('documentos-clientes').getPublicUrl(path);
        await supabase.from('documentos').insert({
          cliente_id: cliente.id,
          nome_arquivo: doc.file.name,
          tipo_documento: doc.tipo,
          arquivo_url: urlData.publicUrl,
          tamanho_bytes: doc.file.size,
          enviado_por: user?.id,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success("Cliente cadastrado com sucesso!");
      navigate(`/clientes/${cliente.id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">Novo Cliente</h1>
          <p className="text-sm text-muted-foreground">Vincule um cliente a uma unidade</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Seleção de Unidade</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Empreendimento *</Label>
              <Select value={empId} onValueChange={v => { setEmpId(v); setUnidadeId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {empreendimentos?.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidade *</Label>
              <Select value={unidadeId} onValueChange={setUnidadeId} disabled={!empId}>
                <SelectTrigger><SelectValue placeholder={empId ? "Selecione" : "Selecione o empreendimento primeiro"} /></SelectTrigger>
                <SelectContent>
                  {unidadesDisponiveis?.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.bloco ? `${u.bloco}-` : ''}{u.numero} {u.tipo ? `(${u.tipo})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo do cliente" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>CPF *</Label>
              <Input value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento *</Label>
              <Input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={e => setTelefone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentos (opcional)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {docs.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="truncate flex-1">{d.file.name}</span>
              <Badge variant="outline">{d.tipo}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setDocs(prev => prev.filter((_, j) => j !== i))}>✕</Button>
            </div>
          ))}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 10 * 1024 * 1024) { toast.error("Arquivo máximo: 10MB"); return; }
                const tipo = prompt("Tipo do documento:\n" + TIPOS_DOC.join(', '));
                if (!tipo) return;
                setDocs(prev => [...prev, { file: f, tipo }]);
                e.target.value = '';
              }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Cadastrar Cliente"}
        </Button>
      </div>
    </div>
  );
}
