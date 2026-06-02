import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ExternalLink, Trash2, Copy, Info, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatCPF, formatPhone } from "@/lib/cpf";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { AgendamentoStatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { PORTAL_URL } from "@/lib/config";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function ClienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editDataNascimento, setEditDataNascimento] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: cliente, refetch, isError, error: queryError } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*, unidades(numero, bloco, andar, tipo, empreendimentos(nome))').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: agendamentos } = useQuery({
    queryKey: ['agendamentos-cliente', id],
    queryFn: async () => {
      const { data } = await supabase.from('agendamentos').select('*').eq('cliente_id', id!);
      return data || [];
    },
  });

  const { data: documentos } = useQuery({
    queryKey: ['documentos-cliente', id],
    queryFn: async () => {
      const { data } = await supabase.from('documentos').select('*').eq('cliente_id', id!).order('criado_em', { ascending: false });
      return data || [];
    },
  });

  const agendamentoAtivo = agendamentos?.find(a => ['aguardando_confirmacao', 'vistoria_agendada'].includes(a.status || '')) || null;
  const hasAgendamentoAtivo = !!agendamentoAtivo;

  const startEditing = () => {
    if (!cliente) return;
    setEditNome(cliente.nome_completo);
    setEditEmail(cliente.email);
    setEditTelefone(cliente.telefone || '');
    setEditDataNascimento(cliente.data_nascimento);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editNome.trim() || editNome.trim().length < 3) { toast.error("Nome deve ter pelo menos 3 caracteres"); return; }
    if (editEmail && !/\S+@\S+\.\S+/.test(editEmail)) { toast.error("E-mail inválido"); return; }
    if (editDataNascimento && new Date(editDataNascimento) > new Date()) { toast.error("Data de nascimento não pode ser futura"); return; }

    setSaving(true);
    const { error } = await supabase.from('clientes').update({
      nome_completo: editNome.trim(),
      email: editEmail.trim(),
      telefone: editTelefone.replace(/\D/g, '') || null,
      data_nascimento: editDataNascimento,
    }).eq('id', id!);
    setSaving(false);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Cliente atualizado com sucesso.");
    setEditing(false);
    refetch();
  };

  const handleDeleteCliente = async () => {
    if (!cliente) return;
    if (hasAgendamentoAtivo) {
      toast.error("Cancele a vistoria agendada antes de excluir o cliente.");
      return;
    }
    if (documentos && documentos.length > 0) {
      for (const doc of documentos) {
        try {
          const path = new URL(doc.arquivo_url).pathname.split('/').slice(-2).join('/');
          await supabase.storage.from('documentos-clientes').remove([path]);
        } catch { /* ignore */ }
      }
      await supabase.from('documentos').delete().eq('cliente_id', cliente.id);
    }
    const { error } = await supabase.from('clientes').delete().eq('id', cliente.id);
    if (error) { toast.error("Erro ao excluir cliente"); return; }
    if (cliente.unidade_id) {
      await supabase.from('unidades').update({
        status: 'aguardando_liberacao',
        disponibilidade_ativa: false,
      } as any).eq('id', cliente.unidade_id);
      if (profile) {
        await supabase.from('historico_status').insert({
          entidade_tipo: 'unidade',
          entidade_id: cliente.unidade_id,
          status_anterior: 'unidade_liberada',
          status_novo: 'aguardando_liberacao',
          alterado_por_tipo: profile.perfil,
          alterado_por_id: profile.id,
          alterado_por_nome: profile.nome,
          motivo: `Cliente ${cliente.nome_completo} excluído`,
        });
      }
    }
    toast.success("Cliente excluído com sucesso.");
    navigate('/clientes');
  };

  if (isError) return (
    <div className="p-6 space-y-2">
      <p className="text-destructive font-medium">Erro ao carregar cliente.</p>
      <p className="text-sm text-muted-foreground">{(queryError as any)?.message}</p>
      <Button variant="outline" onClick={() => navigate('/clientes')}>Voltar</Button>
    </div>
  );
  if (!cliente) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  const unidade = cliente as any;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold">{cliente.nome_completo}</h1>
          <p className="text-sm text-muted-foreground">Detalhes do cliente</p>
        </div>
        <div className="flex gap-2">
          {(profile?.perfil === 'admin' || profile?.perfil === 'vistoriador') && !editing && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="mr-1 h-3 w-3" /> Editar
            </Button>
          )}
          {profile?.perfil === 'admin' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="mr-1 h-3 w-3" /> Excluir</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
                  <AlertDialogDescription>
                    {hasAgendamentoAtivo
                      ? "Cancele a vistoria agendada antes de excluir o cliente."
                      : `Tem certeza que deseja excluir ${cliente.nome_completo}?`
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  {!hasAgendamentoAtivo && (
                    <AlertDialogAction onClick={handleDeleteCliente}>Confirmar Exclusão</AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Unidade Card */}
      <Card>
        <CardHeader><CardTitle className="text-base">Unidade</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Empreendimento:</span><span className="font-medium">{unidade.unidades?.empreendimentos?.nome}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Bloco:</span><span>{unidade.unidades?.bloco || '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Andar:</span><span>{unidade.unidades?.andar || '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Número:</span><span className="font-medium">{unidade.unidades?.numero}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><span>{unidade.unidades?.tipo || '-'}</span></div>
        </CardContent>
      </Card>

      {/* Dados Pessoais */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input value={editNome} onChange={e => setEditNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CPF (somente leitura)</Label>
                <Input value={formatCPF(cliente.cpf)} disabled />
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={editDataNascimento} onChange={e => setEditDataNascimento(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={editTelefone} onChange={e => setEditTelefone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">CPF:</span><span>{formatCPF(cliente.cpf)}</span></div>
              {cliente.data_nascimento && (
                <div className="flex justify-between"><span className="text-muted-foreground">Data Nascimento:</span><span>{formatDate(cliente.data_nascimento + 'T00:00:00')}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">E-mail:</span><span>{cliente.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Telefone:</span><span>{cliente.telefone || '-'}</span></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agendamento Ativo */}
      {hasAgendamentoAtivo && (
        <Card className="border-success/50 bg-success/5">
          <CardHeader><CardTitle className="text-base">Agendamento Ativo</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <p>Data/Hora: {formatDateTime(agendamentoAtivo.data_hora)}</p>
              <p>Status: <AgendamentoStatusBadge status={agendamentoAtivo.status} /></p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/agendamentos')}>Ver Agendamento</Button>
          </CardContent>
        </Card>
      )}

      {/* Portal info */}
      <Card className="bg-muted/50 border-info/30">
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-info" />
            Acesso do Cliente ao Portal
          </div>
          <p className="text-xs text-muted-foreground">
            O cliente acessa o portal usando CPF e e-mail:
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-background rounded px-2 py-1 border flex-1 truncate">{PORTAL_URL}</span>
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(PORTAL_URL);
              toast.success("Link do portal copiado!");
            }}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documentos */}
      {documentos && documentos.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Documentos ({documentos.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documentos.map(doc => (
                <div key={doc.id} className="flex items-center justify-between text-sm border rounded p-2">
                  <div>
                    <span className="font-medium">{doc.nome_arquivo}</span>
                    {doc.tipo_documento && <Badge variant="outline" className="ml-2">{doc.tipo_documento}</Badge>}
                  </div>
                  <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
