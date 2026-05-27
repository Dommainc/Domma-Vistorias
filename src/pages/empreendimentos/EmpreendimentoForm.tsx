import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function EmpreendimentoForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [aceitaAgendamento, setAceitaAgendamento] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

      if (isEdit) {
        const { error } = await supabase.from('empreendimentos').update({
          nome, endereco, cidade, descricao: descricao || null,
          ativo, aceita_agendamento: aceitaAgendamento,
          foto_url: uploadedFotoUrl,
        }).eq('id', id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('empreendimentos').insert({
          nome, endereco, cidade, descricao: descricao || null,
          ativo, aceita_agendamento: aceitaAgendamento,
          foto_url: uploadedFotoUrl,
        });
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
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Empreendimento"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
