import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Plus, Trash2, Eye, Upload } from "lucide-react";

const TIPOS_UNIDADE = ["Studio", "2 Quartos", "3 Quartos", "Cobertura", "Comercial"];

interface UnidadeTemp {
  bloco: string;
  andar: string;
  numero: string;
  tipo: string;
  aceita_agendamento: boolean;
}

export default function EmpreendimentoForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Form state
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [aceitaAgendamento, setAceitaAgendamento] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  // Units state
  const [unidades, setUnidades] = useState<UnidadeTemp[]>([]);
  const [saving, setSaving] = useState(false);

  // Manual unit form
  const [manBloco, setManBloco] = useState("");
  const [manAndar, setManAndar] = useState("");
  const [manNumero, setManNumero] = useState("");
  const [manTipo, setManTipo] = useState("");

  // Batch unit form
  const [batchPrefixo, setBatchPrefixo] = useState("");
  const [batchAndarInicial, setBatchAndarInicial] = useState("");
  const [batchAndarFinal, setBatchAndarFinal] = useState("");
  const [batchNumInicial, setBatchNumInicial] = useState("");
  const [batchNumFinal, setBatchNumFinal] = useState("");
  const [batchTipo, setBatchTipo] = useState("");
  const [batchPreview, setBatchPreview] = useState<UnidadeTemp[]>([]);

  // Load existing data for edit
  const { data: existingEmp } = useQuery({
    queryKey: ['empreendimento', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('empreendimentos').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  const { data: existingUnidades } = useQuery({
    queryKey: ['unidades-empreendimento', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('unidades').select('*').eq('empreendimento_id', id).order('numero');
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  // Initialize form when data loads
  useState(() => {
    if (existingEmp) {
      setNome(existingEmp.nome);
      setEndereco(existingEmp.endereco);
      setCidade(existingEmp.cidade);
      setDescricao(existingEmp.descricao || "");
      setAtivo(existingEmp.ativo ?? true);
      setAceitaAgendamento(existingEmp.aceita_agendamento ?? false);
      setFotoUrl(existingEmp.foto_url);
    }
  });

  // When existing data loads update form
  const loadedRef = useState({ loaded: false })[0];
  if (existingEmp && !loadedRef.loaded) {
    loadedRef.loaded = true;
    setNome(existingEmp.nome);
    setEndereco(existingEmp.endereco);
    setCidade(existingEmp.cidade);
    setDescricao(existingEmp.descricao || "");
    setAtivo(existingEmp.ativo ?? true);
    setAceitaAgendamento(existingEmp.aceita_agendamento ?? false);
    setFotoUrl(existingEmp.foto_url);
  }

  const addManualUnit = () => {
    if (!manNumero.trim()) { toast.error("Número da unidade é obrigatório"); return; }
    setUnidades(prev => [...prev, { bloco: manBloco, andar: manAndar, numero: manNumero, tipo: manTipo, aceita_agendamento: true }]);
    setManBloco(""); setManAndar(""); setManNumero(""); setManTipo("");
  };

  const generateBatchPreview = () => {
    const ai = parseInt(batchAndarInicial);
    const af = parseInt(batchAndarFinal);
    const ni = parseInt(batchNumInicial);
    const nf = parseInt(batchNumFinal);
    if (isNaN(ai) || isNaN(af) || isNaN(ni) || isNaN(nf) || ai > af || ni > nf) {
      toast.error("Verifique os valores de andar e número"); return;
    }
    const generated: UnidadeTemp[] = [];
    for (let andar = ai; andar <= af; andar++) {
      for (let num = ni; num <= nf; num++) {
        const numero = `${andar}${String(num).padStart(2, '0')}`;
        generated.push({
          bloco: batchPrefixo,
          andar: String(andar),
          numero,
          tipo: batchTipo,
          aceita_agendamento: true,
        });
      }
    }
    setBatchPreview(generated);
  };

  const addBatchUnits = () => {
    setUnidades(prev => [...prev, ...batchPreview]);
    setBatchPreview([]);
    setBatchPrefixo(""); setBatchAndarInicial(""); setBatchAndarFinal("");
    setBatchNumInicial(""); setBatchNumFinal(""); setBatchTipo("");
    toast.success(`${batchPreview.length} unidades adicionadas`);
  };

  const handleSave = async () => {
    if (!nome.trim() || !endereco.trim() || !cidade.trim()) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    setSaving(true);
    try {
      let uploadedFotoUrl = fotoUrl;
      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop();
        const path = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('empreendimentos').upload(path, fotoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('empreendimentos').getPublicUrl(path);
        uploadedFotoUrl = urlData.publicUrl;
      }

      let empId = id;
      if (isEdit) {
        const { error } = await supabase.from('empreendimentos').update({
          nome, endereco, cidade, descricao: descricao || null,
          ativo, aceita_agendamento: aceitaAgendamento,
          foto_url: uploadedFotoUrl,
        }).eq('id', id!);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('empreendimentos').insert({
          nome, endereco, cidade, descricao: descricao || null,
          ativo, aceita_agendamento: aceitaAgendamento,
          foto_url: uploadedFotoUrl,
        }).select('id').single();
        if (error) throw error;
        empId = data.id;
      }

      if (unidades.length > 0 && empId) {
        const rows = unidades.map(u => ({
          empreendimento_id: empId!,
          bloco: u.bloco || null,
          andar: u.andar || null,
          numero: u.numero,
          tipo: u.tipo || null,
          aceita_agendamento: u.aceita_agendamento,
          status: 'aguardando_liberacao',
        }));
        const { error } = await supabase.from('unidades').insert(rows);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['empreendimentos'] });
      toast.success(isEdit ? "Empreendimento atualizado!" : "Empreendimento criado com sucesso!");
      navigate('/empreendimentos');
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    // Check if unit has linked client
    const { data: clients } = await supabase.from('clientes').select('id').eq('unidade_id', unitId).limit(1);
    if (clients && clients.length > 0) {
      toast.error("Não é possível remover: unidade possui cliente vinculado");
      return;
    }
    const { error } = await supabase.from('unidades').delete().eq('id', unitId);
    if (error) { toast.error("Erro ao remover unidade"); return; }
    queryClient.invalidateQueries({ queryKey: ['unidades-empreendimento', id] });
    toast.success("Unidade removida");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/empreendimentos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">
            {isEdit ? "Editar Empreendimento" : "Novo Empreendimento"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Atualize os dados do empreendimento" : "Preencha os dados para criar um novo empreendimento"}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          1. Dados do Empreendimento
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          2. Unidades
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do Empreendimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do empreendimento" />
              </div>
              <div className="space-y-2">
                <Label>Cidade *</Label>
                <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço *</Label>
              <Input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Endereço completo" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição do empreendimento" />
            </div>
            <div className="space-y-2">
              <Label>Foto de capa</Label>
              <Input type="file" accept="image/*" onChange={e => {
                const f = e.target.files?.[0];
                if (f && f.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 5MB"); return; }
                setFotoFile(f || null);
              }} />
              {fotoUrl && !fotoFile && <img src={fotoUrl} alt="Capa" className="h-32 rounded-md object-cover" />}
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={ativo} onCheckedChange={setAtivo} />
                <Label>Ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={aceitaAgendamento} onCheckedChange={setAceitaAgendamento} />
                <Label>Aceita agendamentos</Label>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => {
                if (!nome.trim() || !endereco.trim() || !cidade.trim()) { toast.error("Preencha os campos obrigatórios"); return; }
                setStep(2);
              }}>
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {/* Existing units for edit mode */}
          {isEdit && existingUnidades && existingUnidades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Unidades Existentes ({existingUnidades.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bloco</TableHead>
                      <TableHead>Andar</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {existingUnidades.map(u => (
                      <TableRow key={u.id}>
                        <TableCell>{u.bloco || '-'}</TableCell>
                        <TableCell>{u.andar || '-'}</TableCell>
                        <TableCell className="font-medium">{u.numero}</TableCell>
                        <TableCell>{u.tipo || '-'}</TableCell>
                        <TableCell><Badge variant="outline">{u.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUnit(u.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar Unidades</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="manual">
                <TabsList>
                  <TabsTrigger value="manual">Cadastro Manual</TabsTrigger>
                  <TabsTrigger value="lote">Cadastro em Lote</TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-5 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Bloco</Label>
                      <Input value={manBloco} onChange={e => setManBloco(e.target.value)} placeholder="A" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Andar</Label>
                      <Input value={manAndar} onChange={e => setManAndar(e.target.value)} placeholder="1" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Número *</Label>
                      <Input value={manNumero} onChange={e => setManNumero(e.target.value)} placeholder="101" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={manTipo} onValueChange={setManTipo}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_UNIDADE.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addManualUnit} size="sm">
                      <Plus className="mr-1 h-3 w-3" /> Adicionar
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="lote" className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Prefixo do Bloco</Label>
                      <Input value={batchPrefixo} onChange={e => setBatchPrefixo(e.target.value)} placeholder="Torre A" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Andar Inicial *</Label>
                      <Input type="number" value={batchAndarInicial} onChange={e => setBatchAndarInicial(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Andar Final *</Label>
                      <Input type="number" value={batchAndarFinal} onChange={e => setBatchAndarFinal(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nº Inicial por Andar *</Label>
                      <Input type="number" value={batchNumInicial} onChange={e => setBatchNumInicial(e.target.value)} placeholder="1" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nº Final por Andar *</Label>
                      <Input type="number" value={batchNumFinal} onChange={e => setBatchNumFinal(e.target.value)} placeholder="4" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo Padrão</Label>
                      <Select value={batchTipo} onValueChange={setBatchTipo}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_UNIDADE.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="outline" onClick={generateBatchPreview}>
                    <Eye className="mr-2 h-4 w-4" /> Pré-visualizar
                  </Button>
                  {batchPreview.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{batchPreview.length} unidades serão criadas:</p>
                      <div className="max-h-48 overflow-y-auto rounded border p-2">
                        <div className="flex flex-wrap gap-1">
                          {batchPreview.map((u, i) => (
                            <Badge key={i} variant="outline">{u.bloco ? `${u.bloco}-` : ''}{u.numero}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button onClick={addBatchUnits}>Adicionar {batchPreview.length} unidades</Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* New units to save */}
          {unidades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Novas Unidades ({unidades.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bloco</TableHead>
                        <TableHead>Andar</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Remover</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unidades.map((u, i) => (
                        <TableRow key={i}>
                          <TableCell>{u.bloco || '-'}</TableCell>
                          <TableCell>{u.andar || '-'}</TableCell>
                          <TableCell className="font-medium">{u.numero}</TableCell>
                          <TableCell>{u.tipo || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => setUnidades(prev => prev.filter((_, j) => j !== i))}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Salvar Tudo"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
