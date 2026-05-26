import { useEffect, useState } from 'react'
import { X, Mail, Phone, MapPin, Building2, User, Clock, CheckCircle2, Save, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STATUS_CONFIG, STATUS_SELECIONAVEIS } from '@/hooks/useStatusConfig'
import { fetchPessoa } from '@/hooks/useMapaDisponibilidade'
import type { UnidadeCompleta, Pessoa, StatusVistoria } from '@/types/cvcrm'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Historico {
  id: string
  status_anterior: string | null
  status_novo: string
  criado_em: string
  profiles?: { nome: string } | null
}

interface Props {
  unidade: UnidadeCompleta | null
  onClose: () => void
  onStatusChange?: () => void
  nomeEmpreendimento?: string
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`h-4 bg-gray-100 rounded animate-pulse ${className}`} />
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  )
}

export function DrawerUnidade({ unidade, onClose, onStatusChange, nomeEmpreendimento }: Props) {
  const [pessoa, setPessoa] = useState<Pessoa | null>(null)
  const [loadingPessoa, setLoadingPessoa] = useState(false)
  const [historico, setHistorico] = useState<Historico[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [statusSelecionado, setStatusSelecionado] = useState<StatusVistoria>('nao_liberada')
  const [salvando, setSalvando] = useState(false)

  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Resetar e buscar dados ao abrir
  useEffect(() => {
    if (!unidade) {
      setPessoa(null)
      setHistorico([])
      return
    }

    setStatusSelecionado(unidade.statusVistoria)

    // Fonte 1: cliente já enriquecido pela API de reservas (sem fetch extra)
    if (unidade.cliente?.nome) {
      setPessoa({
        id:       unidade.cliente.id_pessoa ?? 0,
        nome:     unidade.cliente.nome,
        cpf:      unidade.cliente.cpf ?? '',
        email:    unidade.cliente.email ?? '',
        telefone: unidade.cliente.telefone ?? '',
        celular:  unidade.cliente.celular ?? '',
      })
      setLoadingPessoa(false)
    }
    // Fonte 2: fallback — buscar pela API de pessoa se tiver id_pessoa
    else if (unidade.id_pessoa) {
      setLoadingPessoa(true)
      fetchPessoa(unidade.id_pessoa)
        .then(p => setPessoa(p))
        .catch(() => setPessoa(null))
        .finally(() => setLoadingPessoa(false))
    } else {
      setPessoa(null)
      setLoadingPessoa(false)
    }

    // Buscar histórico de status no Supabase
    if (unidade.supabaseUnidadeId) {
      setLoadingHistorico(true)
      supabase
        .from('historico_status')
        .select('id, status_anterior, status_novo, criado_em, profiles(nome)')
        .eq('unidade_id', unidade.supabaseUnidadeId)
        .order('criado_em', { ascending: false })
        .limit(10)
        .then(({ data }) => setHistorico((data as Historico[]) ?? []))
        .catch(() => setHistorico([]))
        .finally(() => setLoadingHistorico(false))
    } else {
      setHistorico([])
    }
  }, [unidade])

  // Salvar novo status
  const handleSalvarStatus = async () => {
    if (!unidade?.supabaseUnidadeId || statusSelecionado === unidade.statusVistoria) return

    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Atualizar status na tabela unidades
      const { error } = await supabase
        .from('unidades')
        .update({ status: statusSelecionado })
        .eq('id', unidade.supabaseUnidadeId)

      if (error) throw error

      // 2. Registrar no histórico
      await supabase.from('historico_status').insert({
        unidade_id:      unidade.supabaseUnidadeId,
        status_anterior: unidade.statusVistoria,
        status_novo:     statusSelecionado,
        alterado_por:    user?.id ?? null,
      })

      toast.success(`Status atualizado para "${STATUS_CONFIG[statusSelecionado].label}"`)
      onStatusChange?.()
      onClose()
    } catch (err: any) {
      toast.error('Erro ao salvar status: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  const isOpen = !!unidade
  const config = unidade ? STATUS_CONFIG[unidade.statusVistoria] : null
  const statusAlterado = statusSelecionado !== unidade?.statusVistoria

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes da unidade ${unidade?.codigo ?? ''}`}
        className="fixed right-0 top-0 h-full w-full max-w-[440px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {unidade && config && (
          <>
            {/* ── Header ── */}
            <div
              className="px-5 py-4"
              style={{ background: `linear-gradient(135deg, #1a2744 0%, #1e3a5f 100%)` }}
            >
              {/* Linha superior: fechar + status */}
              <div className="flex items-center justify-between mb-3">
                <Badge
                  className="text-xs font-semibold border-0"
                  style={{ backgroundColor: config.cor, color: config.textoCor }}
                >
                  {config.label}
                </Badge>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>

              {/* Hierarquia: Empreendimento → Bloco → Unidade */}
              {nomeEmpreendimento && (
                <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-2">
                  {nomeEmpreendimento}
                </p>
              )}

              <div className="flex gap-4">
                {/* Bloco */}
                <div className="flex-1 rounded-xl bg-white/10 border border-white/10 px-3 py-2">
                  <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium mb-0.5">
                    Bloco / Lote
                  </p>
                  <p className="text-white font-bold text-sm leading-tight">
                    {unidade.blocoNome ?? '—'}
                  </p>
                </div>

                {/* Unidade */}
                <div className="flex-1 rounded-xl bg-white/10 border border-white/10 px-3 py-2">
                  <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium mb-0.5">
                    Unidade
                  </p>
                  <p className="text-white font-bold text-sm leading-tight">
                    {unidade.codigo}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Conteúdo rolável ── */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Seção 1: Informações da Unidade ── */}
              <div className="px-5 py-4 border-b">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Informações da Unidade
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Código" value={unidade.codigo} />
                  <InfoRow label="Tipo" value={unidade.tipo || '—'} />
                  <InfoRow
                    label="Metragem"
                    value={unidade.metragem > 0 ? `${unidade.metragem.toFixed(2)} m²` : null}
                  />
                  <InfoRow
                    label="Andar"
                    value={unidade.andar > 0 ? `${unidade.andar}º andar` : null}
                  />
                  <InfoRow label="Bloco" value={unidade.blocoNome} />
                  <InfoRow label="Fase / Etapa" value={unidade.faseNome} />
                  {unidade.valor > 0 && (
                    <div className="col-span-2">
                      <InfoRow
                        label="Valor"
                        value={unidade.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Seção 2: Proprietário / Comprador ── */}
              <div className="px-5 py-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Proprietário
                    </h3>
                  </div>
                  {/* Badge status da reserva */}
                  {unidade.cliente?.status_reserva && (
                    <Badge variant="outline" className="text-[10px] font-semibold gap-1 border-amber-300 text-amber-700 bg-amber-50">
                      <ShoppingBag className="h-3 w-3" />
                      {unidade.cliente.status_reserva}
                    </Badge>
                  )}
                </div>

                {loadingPessoa ? (
                  <div className="space-y-2">
                    <Skeleton className="w-3/4 h-5" />
                    <Skeleton className="w-1/2" />
                    <Skeleton className="w-2/3" />
                  </div>
                ) : !pessoa ? (
                  <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-dashed px-3 py-3 text-sm text-muted-foreground">
                    <User className="h-4 w-4 flex-shrink-0" />
                    Sem proprietário / comprador identificado
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Nome em destaque */}
                    <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
                      <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                        {pessoa.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground leading-tight">{pessoa.nome}</p>
                        {pessoa.cpf && (
                          <p className="text-xs text-muted-foreground mt-0.5">CPF: {pessoa.cpf}</p>
                        )}
                      </div>
                    </div>

                    {/* Dados de contato */}
                    <div className="space-y-1.5">
                      {pessoa.email && (
                        <a
                          href={`mailto:${pessoa.email}`}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          {pessoa.email}
                        </a>
                      )}
                      {pessoa.celular && (
                        <a
                          href={`tel:${pessoa.celular}`}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                          {pessoa.celular}
                          <span className="text-xs text-muted-foreground">(celular)</span>
                        </a>
                      )}
                      {pessoa.telefone && pessoa.telefone !== pessoa.celular && (
                        <a
                          href={`tel:${pessoa.telefone}`}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                          {pessoa.telefone}
                          <span className="text-xs text-muted-foreground">(telefone)</span>
                        </a>
                      )}
                      {(pessoa as any).endereco && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          <span>
                            {(pessoa as any).endereco.logradouro}, {(pessoa as any).endereco.numero}
                            {(pessoa as any).endereco.bairro ? ` — ${(pessoa as any).endereco.bairro}` : ''}
                            {(pessoa as any).endereco.cidade ? `, ${(pessoa as any).endereco.cidade}/${(pessoa as any).endereco.estado}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dados da reserva */}
                    {unidade.cliente && (unidade.cliente.data_reserva || unidade.cliente.valor) && (
                      <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                        {unidade.cliente.data_reserva && (
                          <InfoRow
                            label="Data da Reserva"
                            value={(() => {
                              try {
                                return format(new Date(unidade.cliente!.data_reserva!), 'dd/MM/yyyy', { locale: ptBR })
                              } catch { return unidade.cliente!.data_reserva }
                            })()}
                          />
                        )}
                        {unidade.cliente.valor && (
                          <InfoRow
                            label="Valor da Venda"
                            value={unidade.cliente.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Seção 3: Status da Vistoria ── */}
              <div className="px-5 py-4 border-b">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Status da Vistoria
                  </h3>
                </div>
                <div className="space-y-3">
                  <Select
                    value={statusSelecionado}
                    onValueChange={(v) => setStatusSelecionado(v as StatusVistoria)}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: STATUS_CONFIG[statusSelecionado].cor }}
                        />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_SELECIONAVEIS.map(s => (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: STATUS_CONFIG[s].cor }}
                            />
                            {STATUS_CONFIG[s].label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {statusAlterado && (
                    <Button
                      className="w-full h-9"
                      onClick={handleSalvarStatus}
                      disabled={salvando}
                      style={{ background: 'linear-gradient(135deg, #1a2744 0%, #1e3a5f 100%)' }}
                    >
                      {salvando ? (
                        <span className="flex items-center gap-2">
                          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                          Salvando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Save className="h-3.5 w-3.5" />
                          Salvar Status
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* ── Seção 4: Histórico ── */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Histórico de Status
                  </h3>
                </div>

                {loadingHistorico ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="w-2/3" />
                          <Skeleton className="w-1/2 h-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : historico.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-dashed px-3 py-3 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    Nenhuma alteração registrada
                  </div>
                ) : (
                  <div className="relative">
                    {/* Linha vertical da timeline */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
                    <div className="space-y-4">
                      {historico.map((h, i) => {
                        const configNovo = STATUS_CONFIG[h.status_novo as StatusVistoria]
                        const configAnterior = h.status_anterior
                          ? STATUS_CONFIG[h.status_anterior as StatusVistoria]
                          : null
                        return (
                          <div key={h.id} className="flex gap-3 relative">
                            {/* Dot */}
                            <div
                              className="h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm flex-shrink-0 mt-0.5 z-10"
                              style={{ backgroundColor: configNovo?.cor ?? '#9E9E9E' }}
                            />
                            <div className="flex-1 min-w-0 pb-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {configAnterior && (
                                  <>
                                    <span
                                      className="text-xs font-medium px-1.5 py-0.5 rounded"
                                      style={{
                                        backgroundColor: configAnterior.cor + '20',
                                        color: configAnterior.cor,
                                      }}
                                    >
                                      {configAnterior.label}
                                    </span>
                                    <span className="text-muted-foreground text-xs">→</span>
                                  </>
                                )}
                                <span
                                  className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: configNovo?.cor + '20',
                                    color: configNovo?.cor,
                                  }}
                                >
                                  {configNovo?.label ?? h.status_novo}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {h.profiles?.nome && (
                                  <span className="font-medium text-foreground">{h.profiles.nome} · </span>
                                )}
                                {format(new Date(h.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
