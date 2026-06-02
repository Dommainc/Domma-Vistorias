import { Users, Plus, Upload, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { formatCPF, validateCPF } from "@/lib/cpf";
import { toast } from "sonner";
import { parseMapa, normBloco } from "@/lib/mapa-parser";

const EMPREENDIMENTOS_CVCRM = [
  { id: '2', nome: 'Reserva Equitativa' },
  { id: '3', nome: 'Unic Primavera'     },
  { id: '4', nome: 'LIV Primavera'      },
  { id: '5', nome: 'Seleto Primavera'   },
  { id: '6', nome: 'Unic São Gonçalo'   },
  { id: '7', nome: 'Prime Caxias'       },
  { id: '8', nome: 'Seleto Inhaúma'     },
];

interface CVImportRow {
  cvIdUnidade: number;
  numero: string;
  bloco: string;
  tipo: string | null;
  nome: string;
  cpf: string;
  email: string;
  localUnidadeId?: string;
  needsUnitCreation: boolean;
  status: 'ok' | 'already_exists' | 'no_cpf' | 'no_email';
}

const STATUS_LABEL: Record<CVImportRow['status'], string> = {
  ok:             '✅ Importar',
  already_exists: '⏩ Já cadastrado',
  no_cpf:         '❌ CPF inválido',
  no_email:       '❌ E-mail inválido',
};

export default function Clientes() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");

  const [empFiltro, setEmpFiltro] = useState<string>("todos");

  // CSV import state
  const [csvDialog, setCsvDialog] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);

  // CVCRM import state
  const [cvDialog, setCvDialog] = useState(false);
  const [selectedCvEmp, setSelectedCvEmp] = useState("");
  const [selectedLocalEmp, setSelectedLocalEmp] = useState("");
  const [cvRows, setCvRows] = useState<CVImportRow[]>([]);
  const [loadingCv, setLoadingCv] = useState(false);
  const [importingCv, setImportingCv] = useState(false);

  const { data: clientes, isLoading, refetch } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*, unidades(numero, bloco, empreendimentos(nome))').order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: empreendimentos } = useQuery({
    queryKey: ['empreendimentos'],
    queryFn: async () => {
      const { data } = await supabase.from('empreendimentos').select('id, nome').eq('ativo', true).order('nome');
      return data || [];
    },
  });

  const filtered = clientes?.filter(c => {
    if (busca && !c.nome_completo.toLowerCase().includes(busca.toLowerCase()) &&
        !c.email.toLowerCase().includes(busca.toLowerCase()) && !c.cpf.includes(busca)) return false;
    if (empFiltro !== "todos" && (c as any).unidades?.empreendimentos?.nome !== empFiltro) return false;
    return true;
  });

  // --- CSV Import ---
  const downloadTemplate = () => {
    const headers = "empreendimento_nome,unidade_numero,unidade_bloco,nome_completo,cpf,email,telefone";
    const blob = new Blob([headers + "\n"], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'template_clientes.csv'; a.click();
  };

  const handleCsvUpload = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { toast.error("Arquivo vazio ou sem dados"); return; }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: any[] = [];
    const errors: Record<number, string> = {};
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((h, j) => row[h] = vals[j] || '');
      row._line = i;
      const errs: string[] = [];
      if (!row.nome_completo) errs.push("Nome obrigatório");
      if (!validateCPF(row.cpf)) errs.push("CPF inválido");
      if (!row.email || !/\S+@\S+\.\S+/.test(row.email)) errs.push("E-mail inválido");
      if (!row.empreendimento_nome) errs.push("Empreendimento obrigatório");
      if (!row.unidade_numero) errs.push("Número da unidade obrigatório");
      if (errs.length) errors[i] = errs.join('; ');
      rows.push(row);
    }
    setCsvData(rows);
    setCsvErrors(errors);
  };

  const importValidRows = async () => {
    setImporting(true);
    let imported = 0; let failed = 0;
    const validRows = csvData.filter((_, i) => !csvErrors[csvData[i]?._line]);
    for (const row of validRows) {
      try {
        const { data: emp } = await supabase.from('empreendimentos').select('id').eq('nome', row.empreendimento_nome).single();
        if (!emp) { failed++; continue; }
        let q = supabase.from('unidades').select('id').eq('empreendimento_id', emp.id).eq('numero', row.unidade_numero);
        if (row.unidade_bloco) q = q.eq('bloco', row.unidade_bloco);
        const { data: uni } = await q.single();
        if (!uni) { failed++; continue; }
        const { data: existing } = await supabase.from('clientes').select('id').eq('unidade_id', uni.id).limit(1);
        if (existing && existing.length > 0) { failed++; continue; }
        const cpfDigits = row.cpf.replace(/\D/g, '');
        const { error } = await supabase.from('clientes').insert({
          unidade_id: uni.id, nome_completo: row.nome_completo,
          cpf: cpfDigits, email: row.email, telefone: row.telefone || null,
        });
        if (error) { failed++; continue; }
        imported++;
      } catch { failed++; }
    }
    toast.success(`${imported} clientes importados${failed > 0 ? `, ${failed} com erros` : ''}`);
    setImporting(false); setCsvDialog(false); setCsvData([]); refetch();
  };

  // --- CVCRM Import ---
  const fetchCvClientes = async () => {
    if (!selectedCvEmp || !selectedLocalEmp) {
      toast.error("Selecione o empreendimento do CV e o local"); return;
    }
    setLoadingCv(true);
    setCvRows([]);
    try {
      const [mapaRes, reservasRes] = await Promise.all([
        supabase.functions.invoke('cv-crm-mapa', { body: { idEmpreendimento: selectedCvEmp } }),
        supabase.functions.invoke('cv-crm-reservas', { body: { idEmpreendimento: parseInt(selectedCvEmp) } }),
      ]);

      if (mapaRes.error) { toast.error("Erro ao buscar mapa do CVCRM: " + mapaRes.error.message); return; }
      if (reservasRes.error) { toast.error("Erro ao buscar reservas do CVCRM: " + reservasRes.error.message); return; }

      // Usa parseMapa para normalizar blocos (igual ao mapa de disponibilidade)
      const parsed = parseMapa(mapaRes.data, selectedCvEmp);

      // Build CV unit map: idunidade → {numero (limpo), bloco (normalizado)}
      // Remove prefixo "APT"/"APTO" que o CVCRM inclui (ex: "APT 402" → "402")
      const cleanNum = (n: string) => n.replace(/^APT[O]?\s+/i, '').trim();
      const cvUnitMap = new Map<number, { numero: string; bloco: string }>();
      for (const bloco of parsed.blocos) {
        for (const u of bloco.unidades) {
          cvUnitMap.set(u.id, { numero: cleanNum(u.unidade), bloco: u.bloco });
        }
      }

      // Get local units — lookup por normBloco::numero
      const { data: localUnidades } = await supabase.from('unidades')
        .select('id, numero, bloco').eq('empreendimento_id', selectedLocalEmp);

      const localLookup = new Map<string, string>();
      for (const u of localUnidades ?? []) {
        const key = `${normBloco(u.bloco ?? '')}::${String(u.numero).trim()}`;
        localLookup.set(key, u.id);
      }

      const localUnitIds = localUnidades?.map(u => u.id) ?? [];
      const { data: existingClientes } = localUnitIds.length
        ? await supabase.from('clientes').select('unidade_id').in('unidade_id', localUnitIds)
        : { data: [] };
      const existingUnidadeIds = new Set(existingClientes?.map(c => c.unidade_id));

      // Build rows a partir das reservas
      const rows: CVImportRow[] = [];
      for (const r of reservasRes.data?.dados ?? []) {
        const unitInfo = cvUnitMap.get(r.idunidade);
        if (!unitInfo) continue;

        const cpf = (r.documento_cliente || '').replace(/\D/g, '');
        const email = (r.email || '').trim().toLowerCase();
        const key = `${unitInfo.bloco}::${unitInfo.numero}`;
        const localUnidadeId = localLookup.get(key);
        const needsUnitCreation = !localUnidadeId;

        let status: CVImportRow['status'] = 'ok';
        if (!needsUnitCreation && existingUnidadeIds.has(localUnidadeId!)) status = 'already_exists';
        else if (!cpf || cpf.length !== 11)                                status = 'no_cpf';
        else if (!email || !email.includes('@'))                            status = 'no_email';

        // Pega tipo da unidade do mapa para criar localmente se necessário
        const mapaUnit = parsed.blocos.flatMap(b => b.unidades).find(u => u.id === r.idunidade);

        rows.push({ cvIdUnidade: r.idunidade, numero: unitInfo.numero, bloco: unitInfo.bloco, tipo: mapaUnit?.tipo ?? null, nome: r.cliente || '', cpf, email, localUnidadeId, needsUnitCreation, status });
      }

      setCvRows(rows);
      if (!rows.length) toast.info("Nenhuma unidade vendida encontrada neste empreendimento.");
    } catch (e: any) {
      toast.error(e.message || "Erro inesperado");
    } finally {
      setLoadingCv(false);
    }
  };

  const importCvClientes = async () => {
    const validRows = cvRows.filter(r => r.status === 'ok');
    if (!validRows.length) { toast.error("Nenhuma linha válida para importar"); return; }
    setImportingCv(true);
    let imported = 0; let failed = 0;

    for (const row of validRows) {
      try {
        let unidadeId = row.localUnidadeId;

        // Cria a unidade localmente se não existir ainda
        if (row.needsUnitCreation) {
          const { data: novaUnidade, error: uErr } = await supabase.from('unidades').insert({
            empreendimento_id: selectedLocalEmp,
            numero: row.numero,
            bloco: row.bloco,
            tipo: row.tipo ?? null,
            status: 'aguardando_liberacao',
          }).select('id').single();
          if (uErr || !novaUnidade) { failed++; continue; }
          unidadeId = novaUnidade.id;
        }

        const { error } = await supabase.from('clientes').insert({
          unidade_id: unidadeId!,
          nome_completo: row.nome,
          cpf: row.cpf,
          email: row.email,
        });
        if (error) { failed++; continue; }
        imported++;
      } catch { failed++; }
    }
    toast.success(`${imported} clientes importados do CVCRM${failed > 0 ? `, ${failed} com erros` : ''}`);
    setImportingCv(false); setCvDialog(false); setCvRows([]); refetch();
  };

  const cvOk = cvRows.filter(r => r.status === 'ok').length;
  const cvSkip = cvRows.filter(r => r.status !== 'ok').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gerencie os clientes vinculados às unidades</p>
        </div>
        <div className="flex gap-2">
          {/* CVCRM Import */}
          <Dialog open={cvDialog} onOpenChange={v => { setCvDialog(v); if (!v) { setCvRows([]); setSelectedCvEmp(''); setSelectedLocalEmp(''); } }}>
            <DialogTrigger asChild>
              <Button variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Importar do CVCRM</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Importar Clientes do CVCRM</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Empreendimento no CVCRM</label>
                    <Select value={selectedCvEmp} onValueChange={setSelectedCvEmp}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {EMPREENDIMENTOS_CVCRM.map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Empreendimento local</label>
                    <Select value={selectedLocalEmp} onValueChange={setSelectedLocalEmp}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {empreendimentos?.map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={fetchCvClientes} disabled={loadingCv || !selectedCvEmp || !selectedLocalEmp} className="w-full">
                  {loadingCv ? "Buscando..." : "Buscar clientes do CVCRM"}
                </Button>

                {cvRows.length > 0 && (
                  <>
                    <div className="flex gap-3 text-sm flex-wrap">
                      <span className="text-emerald-600 font-medium">{cvOk} para importar</span>
                      {cvRows.filter(r => r.status === 'ok' && r.needsUnitCreation).length > 0 && (
                        <span className="text-blue-600">{cvRows.filter(r => r.status === 'ok' && r.needsUnitCreation).length} criarão unidade nova</span>
                      )}
                      {cvRows.filter(r => r.status === 'already_exists').length > 0 && (
                        <span className="text-muted-foreground">{cvRows.filter(r => r.status === 'already_exists').length} já cadastrados</span>
                      )}
                      {cvRows.filter(r => r.status === 'no_cpf').length > 0 && (
                        <span className="text-red-600">{cvRows.filter(r => r.status === 'no_cpf').length} sem CPF válido</span>
                      )}
                      {cvRows.filter(r => r.status === 'no_email').length > 0 && (
                        <span className="text-red-600">{cvRows.filter(r => r.status === 'no_email').length} sem e-mail</span>
                      )}
                    </div>

                    <div className="max-h-72 overflow-auto rounded border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Unidade</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>CPF</TableHead>
                            <TableHead>E-mail</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cvRows.map((row, i) => (
                            <TableRow key={i} className={row.status !== 'ok' ? 'opacity-50' : ''}>
                              <TableCell className="text-xs">{row.bloco ? `${row.bloco}-` : ''}{row.numero}</TableCell>
                              <TableCell className="text-xs">{row.nome}</TableCell>
                              <TableCell className="text-xs">{formatCPF(row.cpf)}</TableCell>
                              <TableCell className="text-xs">{row.email}</TableCell>
                              <TableCell>
                                <span className="text-xs">
                                  {row.status === 'ok'
                                    ? row.needsUnitCreation ? '🆕 Criar unidade + importar' : '✅ Importar'
                                    : STATUS_LABEL[row.status]}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button onClick={importCvClientes} disabled={importingCv || cvOk === 0} className="w-full">
                      {importingCv ? "Importando..." : `Importar ${cvOk} cliente${cvOk !== 1 ? 's' : ''}${cvRows.filter(r => r.status === 'ok' && r.needsUnitCreation).length > 0 ? ` (${cvRows.filter(r => r.status === 'ok' && r.needsUnitCreation).length} unidades novas)` : ''}`}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* CSV Import */}
          <Dialog open={csvDialog} onOpenChange={setCsvDialog}>
            <DialogTrigger asChild>
              <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Importar CSV</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Importar Clientes via CSV</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Button variant="link" className="p-0" onClick={downloadTemplate}>📥 Download do template CSV</Button>
                <Input type="file" accept=".csv" onChange={e => { if (e.target.files?.[0]) handleCsvUpload(e.target.files[0]); }} />
                {csvData.length > 0 && (
                  <>
                    <div className="max-h-64 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Linha</TableHead><TableHead>Nome</TableHead>
                            <TableHead>CPF</TableHead><TableHead>E-mail</TableHead><TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvData.map((row, i) => (
                            <TableRow key={i} className={csvErrors[row._line] ? 'bg-destructive/10' : ''}>
                              <TableCell>{row._line}</TableCell>
                              <TableCell>{row.nome_completo}</TableCell>
                              <TableCell>{row.cpf}</TableCell>
                              <TableCell>{row.email}</TableCell>
                              <TableCell>
                                {csvErrors[row._line]
                                  ? <span className="text-xs text-destructive">{csvErrors[row._line]}</span>
                                  : <Badge className="bg-success text-success-foreground">✅ OK</Badge>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        {csvData.filter((_, i) => !csvErrors[csvData[i]?._line]).length} válidos, {Object.keys(csvErrors).length} com erros
                      </p>
                      <Button onClick={importValidRows} disabled={importing}>
                        {importing ? "Importando..." : "Importar válidos"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={() => navigate('/clientes/novo')}>
            <Plus className="mr-2 h-4 w-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* Filtro por empreendimento */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setEmpFiltro("todos")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${empFiltro === "todos" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Todos
        </button>
        {empreendimentos?.map((e: any) => (
          <button
            key={e.id}
            onClick={() => setEmpFiltro(e.nome)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${empFiltro === e.nome ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {e.nome}
          </button>
        ))}
      </div>

      <Input placeholder="Buscar por nome, e-mail ou CPF..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-sm" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Clientes {filtered ? `(${filtered.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          !filtered?.length ? <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead><TableHead>CPF</TableHead>
                  <TableHead>E-mail</TableHead><TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome_completo}</TableCell>
                    <TableCell>{formatCPF(c.cpf)}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>
                      {(c as any).unidades ? `${(c as any).unidades.empreendimentos?.nome} - ${(c as any).unidades.bloco ? (c as any).unidades.bloco + '-' : ''}${(c as any).unidades.numero}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/clientes/${c.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
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
