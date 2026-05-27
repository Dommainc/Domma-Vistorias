/**
 * GestaoLiberacaoTable
 * Tabela de gestão de liberação de unidades para vistoria.
 * Exibe dados do CVCRM enriquecidos com configs do Supabase.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMapaDisponibilidade } from '@/hooks/useMapaDisponibilidade'
import { useUnidadeConfigsMap } from '@/hooks/useUnidadeConfig'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import {
  salvarDatasAgendamento,
  liberarAlcada1,
  liberarAlcada2,
  reverterAlcada,
  type PerfilUsuario,
  type UnidadeConfig,
} from '@/services/unidadeConfigService'
import type { MapaUnidade } from '@/types/mapa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Check, X, CalendarDays, Shield, ShieldCheck, RefreshCw } from 'lucide-react'
import { STATUS_LABEL } from '@/types/mapa'

// ── Tipos internos ────────────────────────────────────────────────────────────

type AlcadaStatus = 'pendente' | 'alcada1' | 'liberada'

interface LinhaUnidade {
  unidade: MapaUnidade
  config: UnidadeConfig | null
}

// ── Badge de status de alçada ─────────────────────────────────────────────────

function AlcadaBadge({ config }: { config: UnidadeConfig | null }) {
  if (!config || (!config.alcada1Liberada && !config.alcada2Liberada)) {
    return <Badge variant="secondary" className="text-[10px]">Pendente</Badge>
  }
  if (config.alcada2Liberada) {
    return <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px]">Liberada</Badge>
  }
  return <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px]">1ª alçada</Badge>
}

// ── Célula de data inline ──────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'ok' | 'err'

function DateCell({
  value,
  onSave,
  min,
}: {
  value?: string
  onSave: (v: string | undefined) => Promise<void>
  min?: string
}) {
  const [local, setLocal] = useState(value ?? '')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocal(value ?? '') }, [value])

  const handleBlur = async () => {
    const v = local.trim() || undefined
    if (v === (value ?? undefined)) return
    setSaveState('saving')
    try {
      await onSave(v)
      setSaveState('ok')
    } catch {
      setSaveState('err')
    }
    timerRef.current = setTimeout(() => setSaveState('idle'), 2000)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div className="flex items-center gap-1">
      <Input
        type="date"
        value={local}
        min={min}
        onChange={e => setLocal(e.target.value)}
        onBlur={handleBlur}
        className="h-7 text-xs w-36 px-2"
      />
      {saveState === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      {saveState === 'ok'     && <Check className="h-3 w-3 text-green-600" />}
      {saveState === 'err'    && <X className="h-3 w-3 text-destructive" />}
    </div>
  )
}

// ── Modal de reversão ─────────────────────────────────────────────────────────

function ReverterModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (motivo: string) => Promise<void>
}) {
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!motivo.trim()) { toast.error('O motivo é obrigatório'); return }
    setLoading(true)
    try { await onConfirm(motivo.trim()) }
    finally { setLoading(false); setMotivo('') }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reverter alçada</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-sm">Motivo da reversão *</Label>
          <Textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Descreva o motivo..."
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={loading} onClick={handleConfirm}>
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Reverter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal de edição em lote ───────────────────────────────────────────────────

function LoteModal({
  open,
  onClose,
  count,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  count: number
  onConfirm: (campo: 'agendar' | 'liberar', valor: string) => Promise<void>
}) {
  const [campo, setCampo] = useState<'agendar' | 'liberar'>('agendar')
  const [valor, setValor] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!valor) { toast.error('Selecione uma data'); return }
    setLoading(true)
    try { await onConfirm(campo, valor) }
    finally { setLoading(false); setValor('') }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar datas em lote</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {count} unidades selecionadas serão afetadas.
        </p>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Campo</Label>
            <Select value={campo} onValueChange={v => setCampo(v as any)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agendar">Agendar a partir de</SelectItem>
                <SelectItem value="liberar">Liberar unidade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data</Label>
            <Input type="date" value={valor} onChange={e => setValor(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={loading} onClick={handleConfirm}>
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Aplicar a {count} unidades
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  cvcrm_id_empreendimento: string
}

export function GestaoLiberacaoTable({ cvcrm_id_empreendimento }: Props) {
  const { profile, user } = useAuth()
  const perfil = (profile?.perfil ?? 'vistoriador') as PerfilUsuario
  const isAdmin    = perfil === 'admin'
  const isVist     = perfil === 'vistoriador'
  const isRelac    = perfil === 'relacionamento'

  const qc = useQueryClient()

  // Dados do CVCRM
  const { data: mapa, isLoading: loadingMapa, refetch: refetchMapa } = useMapaDisponibilidade(cvcrm_id_empreendimento)

  // Configs do Supabase
  const { data: configsMap, isLoading: loadingConfigs } = useUnidadeConfigsMap(cvcrm_id_empreendimento)

  // Realtime: atualiza configs quando alguém muda
  useEffect(() => {
    const channel = supabase
      .channel(`gestao_liberacao:${cvcrm_id_empreendimento}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'unidade_config',
        filter: `cvcrm_id_empreendimento=eq.${cvcrm_id_empreendimento}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['unidade-configs-map', cvcrm_id_empreendimento] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [cvcrm_id_empreendimento, qc])

  // Estado de filtros
  const [filtroBloco, setFiltroBloco] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroBusca, setFiltroBusca] = useState('')

  // Seleção em lote
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [loteModal, setLoteModal] = useState(false)

  // Modal de reversão
  const [reverterTarget, setReverterTarget] = useState<{ emp: string; idUnidade: number; alcada: 1 | 2; snapshot: { bloco: string; numero: string } } | null>(null)

  // Flatten unidades de todos os blocos
  const todasUnidades = useMemo<LinhaUnidade[]>(() => {
    if (!mapa) return []
    const linhas: LinhaUnidade[] = []
    for (const bloco of mapa.blocos) {
      for (const u of bloco.unidades) {
        const idNum = u.id != null ? Number(u.id) : null
        linhas.push({
          unidade: u,
          config: idNum != null ? (configsMap?.get(idNum) ?? null) : null,
        })
      }
    }
    return linhas
  }, [mapa, configsMap])

  // Blocos disponíveis para filtro
  const blocos = useMemo(() => {
    const set = new Set(todasUnidades.map(l => l.unidade.bloco))
    return Array.from(set).sort()
  }, [todasUnidades])

  // Filtro aplicado
  const unidadesFiltradas = useMemo(() => {
    return todasUnidades.filter(l => {
      if (filtroBloco !== 'todos' && l.unidade.bloco !== filtroBloco) return false
      if (filtroBusca && !l.unidade.unidade.toLowerCase().includes(filtroBusca.toLowerCase())) return false
      if (filtroStatus !== 'todos') {
        const status = getAlcadaStatus(l.config)
        if (status !== filtroStatus) return false
      }
      return true
    })
  }, [todasUnidades, filtroBloco, filtroStatus, filtroBusca])

  function getAlcadaStatus(config: UnidadeConfig | null): AlcadaStatus {
    if (!config || (!config.alcada1Liberada && !config.alcada2Liberada)) return 'pendente'
    if (config.alcada2Liberada) return 'liberada'
    return 'alcada1'
  }

  // Seleção
  const todosSelecionados = selecionados.size === unidadesFiltradas.length && unidadesFiltradas.length > 0
  const toggleTodos = () => {
    if (todosSelecionados) { setSelecionados(new Set()) }
    else { setSelecionados(new Set(unidadesFiltradas.map(l => `${l.unidade.bloco}::${l.unidade.unidade}`))) }
  }
  const toggleLinha = (key: string) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ── Handlers ──

  const invalidar = () => qc.invalidateQueries({ queryKey: ['unidade-configs-map', cvcrm_id_empreendimento] })

  const handleSalvarData = async (
    u: MapaUnidade,
    campo: 'agendar' | 'liberar',
    valor: string | undefined,
  ) => {
    if (u.id == null) return
    const datas = campo === 'agendar'
      ? { agendarAPartirDe: valor }
      : { liberarParaAgendamento: valor }

    const res = await salvarDatasAgendamento(
      cvcrm_id_empreendimento, Number(u.id), datas, { bloco: u.bloco, numero: u.unidade },
    )
    if (!res.sucesso) throw new Error(res.erro)
    invalidar()
  }

  const handleAlcada1 = async (u: MapaUnidade) => {
    if (!user || u.id == null) return
    const res = await liberarAlcada1(
      cvcrm_id_empreendimento, Number(u.id), user.id, perfil, { bloco: u.bloco, numero: u.unidade },
    )
    if (res.sucesso) { toast.success('1ª alçada liberada'); invalidar() }
    else toast.error(res.erro ?? 'Erro')
  }

  const handleAlcada2 = async (u: MapaUnidade) => {
    if (!user || u.id == null) return
    const res = await liberarAlcada2(
      cvcrm_id_empreendimento, Number(u.id), user.id, perfil, { bloco: u.bloco, numero: u.unidade },
    )
    if (res.sucesso) { toast.success('2ª alçada liberada'); invalidar() }
    else toast.error(res.erro ?? 'Erro')
  }

  const handleReverterConfirm = async (motivo: string) => {
    if (!reverterTarget || !user) return
    const res = await reverterAlcada(
      reverterTarget.emp, reverterTarget.idUnidade, reverterTarget.alcada,
      user.id, perfil, motivo, reverterTarget.snapshot,
    )
    if (res.sucesso) { toast.success('Alçada revertida'); invalidar() }
    else toast.error(res.erro ?? 'Erro')
    setReverterTarget(null)
  }

  const handleLoteConfirm = async (campo: 'agendar' | 'liberar', valor: string) => {
    const linhasSel = unidadesFiltradas.filter(l =>
      selecionados.has(`${l.unidade.bloco}::${l.unidade.unidade}`)
    )
    let ok = 0, err = 0
    for (const l of linhasSel) {
      if (l.unidade.id == null) continue
      const datas = campo === 'agendar'
        ? { agendarAPartirDe: valor }
        : { liberarParaAgendamento: valor }
      const res = await salvarDatasAgendamento(
        cvcrm_id_empreendimento, Number(l.unidade.id), datas,
        { bloco: l.unidade.bloco, numero: l.unidade.unidade },
      )
      res.sucesso ? ok++ : err++
    }
    invalidar()
    toast.success(`${ok} unidades atualizadas${err ? ` (${err} erros)` : ''}`)
    setLoteModal(false)
    setSelecionados(new Set())
  }

  const loading = loadingMapa || loadingConfigs

  return (
    <div className="space-y-4">
      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar unidade..."
          value={filtroBusca}
          onChange={e => setFiltroBusca(e.target.value)}
          className="h-8 text-sm w-40"
        />
        <Select value={filtroBloco} onValueChange={setFiltroBloco}>
          <SelectTrigger className="h-8 text-sm w-36"><SelectValue placeholder="Bloco" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os blocos</SelectItem>
            {blocos.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="h-8 text-sm w-40"><SelectValue placeholder="Status alçada" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="alcada1">1ª alçada liberada</SelectItem>
            <SelectItem value="liberada">Liberada</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="h-8" onClick={() => refetchMapa()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        {selecionados.size >= 2 && (
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setLoteModal(true)}>
            <CalendarDays className="h-3.5 w-3.5" />
            Aplicar data em lote ({selecionados.size})
          </Button>
        )}
      </div>

      {/* ── Tabela ── */}
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando unidades...
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 w-8">
                  <Checkbox
                    checked={todosSelecionados}
                    onCheckedChange={toggleTodos}
                    aria-label="Selecionar todas"
                  />
                </th>
                <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wider">Unidade</th>
                <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wider">Bloco</th>
                <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wider">Etapa</th>
                <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wider">Situação</th>
                <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wider">Agendar a partir de</th>
                <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wider">Liberar unidade</th>
                <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wider">Status alçada</th>
                <th className="px-3 py-2 text-right font-semibold text-xs uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {unidadesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                    Nenhuma unidade encontrada
                  </td>
                </tr>
              ) : unidadesFiltradas.map((l) => {
                const u = l.unidade
                const cfg = l.config
                const key = `${u.bloco}::${u.unidade}`
                const selecionado = selecionados.has(key)
                const alcada1ok = cfg?.alcada1Liberada ?? false
                const alcada2ok = cfg?.alcada2Liberada ?? false

                return (
                  <tr key={key} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${selecionado ? 'bg-primary/5' : ''}`}>
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selecionado}
                        onCheckedChange={() => toggleLinha(key)}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{u.unidade}</td>
                    <td className="px-3 py-2 text-muted-foreground">{u.bloco}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{u.fase || '—'}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs">{STATUS_LABEL[u.status]}</span>
                    </td>
                    <td className="px-3 py-2">
                      {(isAdmin || isRelac || isVist) ? (
                        <DateCell
                          value={cfg?.agendarAPartirDe}
                          onSave={v => handleSalvarData(u, 'agendar', v)}
                        />
                      ) : (
                        <span className="text-xs">{cfg?.agendarAPartirDe ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {(isAdmin || isRelac || isVist) ? (
                        <DateCell
                          value={cfg?.liberarParaAgendamento}
                          min={cfg?.agendarAPartirDe}
                          onSave={v => handleSalvarData(u, 'liberar', v)}
                        />
                      ) : (
                        <span className="text-xs">{cfg?.liberarParaAgendamento ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <AlcadaBadge config={cfg} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">

                        {/* Botão 1ª alçada — só vistoriador */}
                        {isVist && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant={alcada1ok ? 'ghost' : 'outline'}
                                className="h-7 text-xs gap-1"
                                disabled={alcada1ok}
                                onClick={() => handleAlcada1(u)}
                              >
                                <Shield className="h-3 w-3" />
                                {alcada1ok ? '1ª ✓' : '1ª alçada'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {alcada1ok ? '1ª alçada já liberada' : 'Liberar 1ª alçada'}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Botão 2ª alçada — só relacionamento */}
                        {isRelac && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant={alcada2ok ? 'ghost' : 'outline'}
                                className="h-7 text-xs gap-1"
                                disabled={alcada2ok || !alcada1ok}
                                onClick={() => handleAlcada2(u)}
                              >
                                <ShieldCheck className="h-3 w-3" />
                                {alcada2ok ? '2ª ✓' : '2ª alçada'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {alcada2ok
                                ? '2ª alçada já liberada'
                                : !alcada1ok
                                  ? 'Aguardando 1ª alçada (Vistoriador)'
                                  : 'Liberar 2ª alçada'}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Botão reverter — só admin */}
                        {isAdmin && (alcada1ok || alcada2ok) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => setReverterTarget({
                                  emp: cvcrm_id_empreendimento,
                                  idUnidade: Number(u.id),
                                  alcada: alcada2ok ? 2 : 1,
                                  snapshot: { bloco: u.bloco, numero: u.unidade },
                                })}
                              >
                                <X className="h-3 w-3" /> Reverter
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reverter alçada</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {unidadesFiltradas.length} de {todasUnidades.length} unidades
      </p>

      {/* Modal reversão */}
      <ReverterModal
        open={!!reverterTarget}
        onClose={() => setReverterTarget(null)}
        onConfirm={handleReverterConfirm}
      />

      {/* Modal lote */}
      <LoteModal
        open={loteModal}
        onClose={() => setLoteModal(false)}
        count={selecionados.size}
        onConfirm={handleLoteConfirm}
      />
    </div>
  )
}
