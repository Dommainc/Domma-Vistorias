import { Users, Plus, Upload, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { formatCPF, validateCPF } from "@/lib/cpf";
import { toast } from "sonner";

export default function Clientes() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [csvDialog, setCsvDialog] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);

  const { data: clientes, isLoading, refetch } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*, unidades(numero, bloco, empreendimentos(nome))').order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = clientes?.filter(c =>
    !busca || c.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
    c.email.toLowerCase().includes(busca.toLowerCase()) ||
    c.cpf.includes(busca)
  );

  const downloadTemplate = () => {
    const headers = "empreendimento_nome,unidade_numero,unidade_bloco,nome_completo,cpf,data_nascimento,email,telefone";
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
      if (!row.data_nascimento) errs.push("Data nascimento obrigatória");
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
    let imported = 0;
    let failed = 0;
    const validRows = csvData.filter((_, i) => !csvErrors[csvData[i]?._line]);

    for (const row of validRows) {
      try {
        const { data: emp } = await supabase.from('empreendimentos').select('id').eq('nome', row.empreendimento_nome).single();
        if (!emp) { failed++; continue; }

        let q = supabase.from('unidades').select('id, status').eq('empreendimento_id', emp.id).eq('numero', row.unidade_numero);
        if (row.unidade_bloco) q = q.eq('bloco', row.unidade_bloco);
        const { data: uni } = await q.single();
        if (!uni) { failed++; continue; }

        const { data: existing } = await supabase.from('clientes').select('id').eq('unidade_id', uni.id).limit(1);
        if (existing && existing.length > 0) { failed++; continue; }

        const cpfDigits = row.cpf.replace(/\D/g, '');
        const { error } = await supabase.from('clientes').insert({
          unidade_id: uni.id,
          nome_completo: row.nome_completo,
          cpf: cpfDigits,
          data_nascimento: row.data_nascimento,
          email: row.email,
          telefone: row.telefone || null,
        });
        if (error) { failed++; continue; }
        imported++;
      } catch { failed++; }
    }

    toast.success(`${imported} clientes importados${failed > 0 ? `, ${failed} com erros` : ''}`);
    setImporting(false);
    setCsvDialog(false);
    setCsvData([]);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gerencie os clientes vinculados às unidades</p>
        </div>
        <div className="flex gap-2">
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
                            <TableHead>Linha</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>CPF</TableHead>
                            <TableHead>E-mail</TableHead>
                            <TableHead>Status</TableHead>
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
                                {csvErrors[row._line] ? (
                                  <span className="text-xs text-destructive">{csvErrors[row._line]}</span>
                                ) : <Badge className="bg-success text-success-foreground">✅ OK</Badge>}
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
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Unidade</TableHead>
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
