import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, X, Check, LayoutGrid, Ruler, Car, User, ClipboardList, Loader2, Shield, ShieldCheck, AlertCircle } from 'lucide-react'
import { STATUS_BG, STATUS_LABEL, VISTORIA_STATUS_LABEL, type MapaUnidade } from '@/types/mapa'
import type { UnidadeValorRow, ValoresMap } from '@/hooks/useMapaDisponibilidade'
import { useAuth } from '@/hooks/useAuth'
import { useUnidadeConfigsMap } from '@/hooks/useUnidadeConfig'
import { verificarAptidaoVistoria } from '@/services/unidadeConfigService'

interface Props {
  open: boolean
  onClose: () => void
  unidade: MapaUnidade | null
  empreendimentoId: string
  empreendimentoNome: string
  valorRow: UnidadeValorRow | null
  canEdit: boolean
}

const fmtBRL = (v?: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Hook interno: busca dados do cliente no CVCRM para unidades vendidas

function useCvCrmCliente(
  idUnidade: number | undefined,
  empreendimentoId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['cvcrm-reservas-cliente', empreendimentoId, idUnidade],
    enabled: enabled && !!idUnidade && !!empreendimentoId,
    staleTime: 120_000,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return null

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cv-crm-reservas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ idEmpreendimento: empreendimentoId }),
        },
      )
      if (!res.ok) return null
      const json = await res.json()
      const dados: any[] = json.dados ?? []
      return dados.find(d => d.idunidade === idUnidade) ?? null
    },
  })
}

// ── Hook interno: resolve unidade + cliente no Supabase via bloco + numero + empNome

function useUnidadeSupabase(bloco: string, numero: string, empNome: string, enabled: boolean) {
  return useQuery({
    queryKey: ['unidade-supabase-mapa', bloco, numero, empNome],
    enabled: enabled && !!bloco && !!numero && !!empNome,
    staleTime: 30_000,
    queryFn: async () => {
      // 1. Resolver UUID do empreendimento
      const { data: emps } = await supabase
        .from('empreendimentos')
        .select('id')
        .ilike('nome', empNome.trim())
        .limit(1)

      if (!emps?.length) return { unidade: null, cliente: null, empId: null }
      const empId = emps[0].id

      // 2. Buscar unidade pelo bloco + numero
      const { data: unidadeData } = await supabase
        .from('unidades')
        .select('id, bloco, numero, status, tipo, empreendimento_id')
        .eq('empreendimento_id', empId)
        .eq('bloco', bloco)
        .eq('numero', numero)
        .maybeSingle()

      if (!unidadeData) return { unidade: null, cliente: null, empId }

      // 3. Buscar cliente vinculado
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('id, nome_completo, email, cpf, telefone')
        .eq('unidade_id', unidadeData.id)
        .limit(1)

      return {
        unidade: unidadeData,
        cliente: clienteData?.[0] ?? null,
        empId,
      }
    },
  })
}

// ── Seção de valores editável

function ValoresSection({
  valorRow,
  canEdit,
  empreendimentoId,
  bloco,
  unidade: unidadeStr,
}: {
  valorRow: UnidadeValorRow | null
  canEdit: boolean
  empreendimentoId: string
  bloco: string
  unidade: string
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [valVenda, setValVenda]         = useState('')
  const [valAvaliacao, setValAvaliacao] = useState('')
  const [saving, setSaving] = useState(false)

  const handleOpenEdit = () => {
    setValVenda(valorRow?.valor_venda     != null ? String(valorRow.valor_venda)     : '')
    setValAvaliacao(valorRow?.valor_avaliacao != null ? String(valorRow.valor_avaliacao) : '')
    setEditing(true)
  }

  const parseNum = (s: string) => {
    if (!s.trim()) return null
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'))
    return isNaN(n) || n < 0 ? null : n
  }

  const handleSalvar = async () => {
    const venda     = parseNum(valVenda)
    const avaliacao = parseNum(valAvaliacao)
    if (valVenda     && venda     === null) { toast.error('Valor de venda inválido');     return }
    if (valAvaliacao && avaliacao === null) { toast.error('Valor de avaliação inválido'); return }

    setSaving(true)
    try {
      const { error } = await supabase.from('unidade_valores' as any).upsert(
        { id_empreendimento: empreendimentoId, bloco, unidade: unidadeStr, valor_venda: venda, valor_avaliacao: avaliacao },
        { onConflict: 'id_empreendimento,bloco,unidade' }
      )
      if (error) throw error
      toast.success('Valores salvos com sucesso')
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['unidade-valores', empreendimentoId] })
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/50 border-b flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valores</span>
        {canEdit && !editing && (
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleOpenEdit}>
            <Pencil className="h-3 w-3" /> Editar
          </Button>
        )}
      </div>

      {editing ? (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valor de Venda (R$)</Label>
              <Input value={valVenda} onChange={e => setValVenda(e.target.value)} placeholder="Ex: 250000" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valor de Avaliação (R$)</Label>
              <Input value={valAvaliacao} onChange={e => setValAvaliacao(e.target.value)} placeholder="Ex: 240000" className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setEditing(false)}>
              <X className="h-3 w-3" /> Cancelar
            </Button>
            <Button size="sm" className="h-7 gap-1" disabled={saving} onClick={handleSalvar}>
              <Check className="h-3 w-3" /> {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 divide-x">
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Venda</p>
            <p className="text-base font-bold text-foreground">{fmtBRL(valorRow?.valor_venda)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Avaliação</p>
            <p className="text-base font-bold text-foreground">{fmtBRL(valorRow?.valor_avaliacao)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal

export function UnidadeSidePanel({
  open, onClose, unidade, empreendimentoId, empreendimentoNome, valorRow, canEdit,
}: Props) {
  const navigate  = useNavigate()
  const { profile } = useAuth()
  const isAdmin   = profile?.perfil === 'admin'
  const [criando, setCriando] = useState(false)

  const { data: supaData, isLoading: loadingSupabase } = useUnidadeSupabase(
    unidade?.bloco ?? '',
    unidade?.unidade ?? '',
    empreendimentoNome,
    open && !!unidade,
  )

  const isVendida = unidade?.status === 'vendida'
  const { data: cvCrmCliente, isLoading: loadingCvCrm } = useCvCrmCliente(
    unidade?.id ? Number(unidade.id) : undefined,
    empreendimentoId,
    open && isVendida,
  )

  // Config de liberação (alçadas)
  const { data: configsMap } = useUnidadeConfigsMap(open ? empreendimentoId : null)
  const liberacaoConfig = unidade?.id != null ? configsMap?.get(Number(unidade.id)) ?? null : null

  // Modal de bloqueio de vistoria
  const [bloqueioMotivo, setBloqueioMotivo] = useState<string | null>(null)

  if (!unidade) return null

  const bg    = STATUS_BG[unidade.status]
  const label = STATUS_LABEL[unidade.status]
  const vistoriaStatus = supaData?.unidade
    ? (() => {
        switch (supaData.unidade.status) {
          case 'unidade_liberada':   return 'liberada'
          case 'vistoria_agendada':  return 'agendada'
          case 'vistoria_concluida': return 'aprovada'
          case 'vistoria_reprovada': return 'reprovada'
          case 'vistoria_cancelada': return 'cancelada'
          default:                   return 'nao_liberada'
        }
      })()
    : 'nao_liberada'

  const handleGestao = async () => {
    // Verificar aptidão para vistoria antes de navegar
    if (unidade?.id != null && empreendimentoId) {
      const aptidao = await verificarAptidaoVistoria(
        empreendimentoId,
        Number(unidade.id),
        unidade.status,
      )
      if (!aptidao.apta) {
        setBloqueioMotivo(aptidao.motivo ?? 'Unidade não está apta para vistoria')
        return
      }
    }

    if (supaData?.unidade?.id) {
      navigate(`/unidades/${supaData.unidade.id}`)
      onClose()
      return
    }

    if (!isAdmin) return // botão desabilitado, não deveria chegar aqui

    if (!supaData?.empId) {
      toast.error('Empreendimento não encontrado no sistema. Cadastre-o primeiro.')
      return
    }

    setCriando(true)
    try {
      const { data: nova, error } = await supabase
        .from('unidades')
        .insert({
          empreendimento_id: supaData.empId,
          bloco: unidade.bloco,
          numero: unidade.unidade,
          status: 'aguardando_liberacao',
        } as any)
        .select('id')
        .single()

      if (error) throw error
      toast.success('Unidade criada e aberta para gestão')
      navigate(`/unidades/${nova.id}`)
      onClose()
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao criar unidade')
    } finally {
      setCriando(false)
    }
  }

  const btnDesabilitado = !isAdmin && !supaData?.unidade

  return (
    <>
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-[440px] max-w-full p-0 flex flex-col gap-0">
        {/* ── Cabeçalho colorido */}
        <div className="px-6 py-5 flex-shrink-0" style={{ backgroundColor: bg }}>
          <p className="text-white/70 text-[11px] font-medium uppercase tracking-widest mb-0.5">Unidade</p>
          <h2 className="text-white text-2xl font-bold leading-tight">
            {unidade.bloco} – {unidade.unidade}
          </h2>
          <p className="text-white/75 text-sm mt-1">{empreendimentoNome}</p>
          <div className="mt-3">
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-white/30"
              style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.2)' }}
            >
              {label}
            </span>
          </div>
        </div>

        {/* ── Corpo rolável */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-5">

            {/* Dados Técnicos CVCRM */}
            {(unidade.tipo || unidade.area_total != null || unidade.area_privativa != null || unidade.vagas != null) && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dados Técnicos</p>
                <div className="grid grid-cols-2 gap-2">
                  {unidade.tipo && (
                    <InfoItem icon={<LayoutGrid className="h-3.5 w-3.5" />} label="Tipologia" value={unidade.tipo} />
                  )}
                  {unidade.area_total != null && (
                    <InfoItem icon={<Ruler className="h-3.5 w-3.5" />} label="Área total" value={`${unidade.area_total.toFixed(2)} m²`} />
                  )}
                  {unidade.area_privativa != null && (
                    <InfoItem icon={<Ruler className="h-3.5 w-3.5" />} label="Área privativa" value={`${unidade.area_privativa.toFixed(2)} m²`} />
                  )}
                  {unidade.vagas != null && (
                    <InfoItem icon={<Car className="h-3.5 w-3.5" />} label="Vagas" value={String(unidade.vagas)} />
                  )}
                </div>
              </div>
            )}

            {/* Status de Vistoria */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status de Vistoria</p>
              <VistoriaStatusBadge status={vistoriaStatus as any} />
            </div>

            {/* Status de Liberação (Alçadas) */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Liberação para Vistoria
              </p>
              <div className="rounded-lg border divide-y text-sm">
                <div className="px-3 py-2 flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">1ª alçada (Vistoriador)</span>
                  {liberacaoConfig?.alcada1Liberada ? (
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] gap-1">
                      <ShieldCheck className="h-3 w-3" /> Liberada
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Pendente</Badge>
                  )}
                </div>
                <div className="px-3 py-2 flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">2ª alçada (Relacionamento)</span>
                  {liberacaoConfig?.alcada2Liberada ? (
                    <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] gap-1">
                      <ShieldCheck className="h-3 w-3" /> Liberada
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Pendente</Badge>
                  )}
                </div>
                {liberacaoConfig?.agendarAPartirDe && (
                  <div className="px-3 py-2 flex justify-between">
                    <span className="text-muted-foreground text-xs">Agendar a partir de</span>
                    <span className="text-xs font-medium">
                      {new Date(liberacaoConfig.agendarAPartirDe + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                {liberacaoConfig?.liberarParaAgendamento && (
                  <div className="px-3 py-2 flex justify-between">
                    <span className="text-muted-foreground text-xs">Liberar para agendamento</span>
                    <span className="text-xs font-medium">
                      {new Date(liberacaoConfig.liberarParaAgendamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Proprietário / Cliente */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Proprietário / Cliente
              </p>
              {(loadingSupabase || (isVendida && loadingCvCrm)) ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...
                </div>
              ) : isVendida && cvCrmCliente ? (
                <div className="rounded-lg border divide-y text-sm">
                  {cvCrmCliente.situacao && (
                    <div className="px-3 py-2 flex justify-between">
                      <span className="text-muted-foreground">Situação</span>
                      <span className="font-medium">{cvCrmCliente.situacao}</span>
                    </div>
                  )}
                  {cvCrmCliente.cliente && (
                    <div className="px-3 py-2 flex justify-between">
                      <span className="text-muted-foreground">Cliente</span>
                      <span className="font-medium">{cvCrmCliente.cliente}</span>
                    </div>
                  )}
                  {cvCrmCliente.documento_cliente && (
                    <div className="px-3 py-2 flex justify-between">
                      <span className="text-muted-foreground">Documento</span>
                      <span>{cvCrmCliente.documento_cliente}</span>
                    </div>
                  )}
                  {cvCrmCliente.email && (
                    <div className="px-3 py-2 flex justify-between">
                      <span className="text-muted-foreground">E-mail</span>
                      <span>{cvCrmCliente.email}</span>
                    </div>
                  )}
                  {cvCrmCliente.idade != null && (
                    <div className="px-3 py-2 flex justify-between">
                      <span className="text-muted-foreground">Idade</span>
                      <span>{cvCrmCliente.idade} anos</span>
                    </div>
                  )}
                </div>
              ) : supaData?.cliente ? (
                <div className="rounded-lg border divide-y text-sm">
                  <div className="px-3 py-2 flex justify-between">
                    <span className="text-muted-foreground">Nome</span>
                    <span className="font-medium">{supaData.cliente.nome_completo}</span>
                  </div>
                  <div className="px-3 py-2 flex justify-between">
                    <span className="text-muted-foreground">E-mail</span>
                    <span>{supaData.cliente.email}</span>
                  </div>
                  {supaData.cliente.cpf && (
                    <div className="px-3 py-2 flex justify-between">
                      <span className="text-muted-foreground">CPF</span>
                      <span>{supaData.cliente.cpf}</span>
                    </div>
                  )}
                  {supaData.cliente.telefone && (
                    <div className="px-3 py-2 flex justify-between">
                      <span className="text-muted-foreground">Telefone</span>
                      <span>{supaData.cliente.telefone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nenhum cliente vinculado a esta unidade.</p>
              )}
            </div>

            {/* Valores (admin only) */}
            {canEdit && (
              <ValoresSection
                valorRow={valorRow}
                canEdit={canEdit}
                empreendimentoId={empreendimentoId}
                bloco={unidade.bloco}
                unidade={unidade.unidade}
              />
            )}
          </div>
        </ScrollArea>

        {/* ── Footer fixo */}
        <div className="flex-shrink-0 border-t px-6 py-4 space-y-2">
          <Button
            className="w-full gap-2"
            onClick={handleGestao}
            disabled={btnDesabilitado || criando}
            title={btnDesabilitado ? 'Unidade não cadastrada. Solicite ao administrador.' : undefined}
          >
            <ClipboardList className="h-4 w-4" />
            {criando ? 'Criando unidade…' : 'Ir para Gestão da Vistoria'}
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => { navigate(`/empreendimentos/${empreendimentoId}/liberacao`); onClose() }}
          >
            <Shield className="h-4 w-4" />
            Gestão de Liberação
          </Button>
          {btnDesabilitado && (
            <p className="text-xs text-muted-foreground text-center mt-1">
              Unidade não cadastrada. Solicite ao administrador.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>

    {/* Modal de bloqueio de vistoria */}
    <Dialog open={!!bloqueioMotivo} onOpenChange={o => !o && setBloqueioMotivo(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Não é possível iniciar a vistoria
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{bloqueioMotivo}</p>
        <div className="flex justify-end">
          <Button onClick={() => setBloqueioMotivo(null)}>Entendi</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  )
}

// ── Helpers visuais

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

const VISTORIA_COLORS: Record<string, string> = {
  nao_liberada: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  liberada:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  agendada:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  aprovada:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  reprovada:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelada:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

function VistoriaStatusBadge({ status }: { status: keyof typeof VISTORIA_STATUS_LABEL }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${VISTORIA_COLORS[status] ?? ''}`}>
      {VISTORIA_STATUS_LABEL[status]}
    </span>
  )
}
