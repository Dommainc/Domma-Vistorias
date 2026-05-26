import { useMemo, useState } from 'react'
import { useEmpreendimentos, useMapaDisponibilidade, useUnidadeValores, useVistoriaStatusMap } from '@/hooks/useMapaDisponibilidade'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { BlocoGrid } from '@/components/mapa/BlocoGrid'
import { UnidadeSidePanel } from '@/components/mapa/UnidadeSidePanel'
import { ImportarValoresDialog } from '@/components/mapa/ImportarValoresDialog'
import { Upload, Loader2, AlertCircle, Search, RefreshCw, Map } from 'lucide-react'
import { STATUS_BG, STATUS_LABEL, type MapaUnidade } from '@/types/mapa'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

const EMPREENDIMENTOS_CVCRM = [
  { id: '2', nome: 'Reserva Equitativa' },
  { id: '3', nome: 'Unic Primavera'     },
  { id: '4', nome: 'LIV Primavera'      },
  { id: '5', nome: 'Seleto Primavera'   },
  { id: '6', nome: 'Unic São Gonçalo'   },
  { id: '7', nome: 'Prime Caxias'       },
  { id: '8', nome: 'Seleto Inhaúma'     },
]

const LEGENDA = [
  { status: 'disponivel',  label: 'Disponível'  },
  { status: 'reservada',   label: 'Reservada'   },
  { status: 'vendida',     label: 'Vendida'     },
  { status: 'em_processo', label: 'Em Processo' },
  { status: 'bloqueada',   label: 'Bloqueada'   },
] as const

export default function MapaDisponibilidade() {
  const { profile } = useAuth()
  const isAdmin     = profile?.perfil === 'admin'
  const qc          = useQueryClient()

  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const [unidadeAtiva, setUnidadeAtiva] = useState<MapaUnidade | null>(null)
  const [importOpen,   setImportOpen]   = useState(false)
  const [busca,        setBusca]        = useState('')

  const { data: empreendimentos = [] } = useEmpreendimentos()
  const { data: mapaRaw, isLoading, error, refetch, isFetching } = useMapaDisponibilidade(selectedId)
  const { data: valores = {} } = useUnidadeValores(selectedId)

  // Vistoriadores não veem "Bloqueada" — aparece como "Vendida"
  const mapa = useMemo(() => {
    if (!mapaRaw || isAdmin) return mapaRaw
    return {
      ...mapaRaw,
      blocos: mapaRaw.blocos.map(b => ({
        ...b,
        unidades: b.unidades.map(u =>
          u.status === 'bloqueada' ? { ...u, status: 'vendida' as const } : u
        ),
      })),
      totais: {
        ...mapaRaw.totais,
        vendida:   mapaRaw.totais.vendida   + mapaRaw.totais.bloqueada,
        bloqueada: 0,
      },
    }
  }, [mapaRaw, isAdmin])

  const empAtual = empreendimentos.find(e => e.id_empreendimento === selectedId)
    ?? EMPREENDIMENTOS_CVCRM.find(e => e.id === selectedId)
  const empNome = mapa?.nome || empAtual?.nome || selectedId || ''

  // Hook de status de vistoria — uma query por empreendimento carregado
  const { data: vistoriaMap = new Map() } = useVistoriaStatusMap(empNome)

  // Auto-registra empreendimento na tabela local ao carregar com sucesso
  useMemo(() => {
    if (!mapa || !selectedId || !mapa.nome || !isAdmin) return
    if (empreendimentos.some(e => e.id_empreendimento === selectedId)) return
    supabase.from('empreendimentos_mapa' as any)
      .upsert({ id_empreendimento: selectedId, nome: mapa.nome })
      .then(({ error }) => { if (!error) qc.invalidateQueries({ queryKey: ['empreendimentos-mapa'] }) })
  }, [mapa?.nome, selectedId])

  // Filtro de busca por unidade
  const mapaFiltrado = useMemo(() => {
    if (!mapa || !busca.trim()) return mapa
    const q = busca.toLowerCase()
    return {
      ...mapa,
      blocos: mapa.blocos.map(b => ({
        ...b,
        unidades: b.unidades.filter(u =>
          u.unidade.toLowerCase().includes(q) ||
          u.bloco.toLowerCase().includes(q) ||
          (u.tipo ?? '').toLowerCase().includes(q)
        ),
      })).filter(b => b.unidades.length > 0),
    }
  }, [mapa, busca])

  const handleSelect = (id: string) => {
    setSelectedId(id || null)
    setBusca('')
    setUnidadeAtiva(null)
  }

  const errMsg = error
    ? String((error as any)?.message ?? '').toLowerCase().includes('non-2xx') ||
      String((error as any)?.message ?? '').includes('edge function')
      ? 'A Edge Function cv-crm-mapa não está acessível. Verifique se está publicada no Supabase.'
      : `Erro ao carregar: ${(error as any).message ?? 'erro desconhecido'}`
    : null

  // Lista para o seletor: empreendimentos já cadastrados + lista fixa CVCRM
  const listaSelect = useMemo(() => {
    const ids = new Set(empreendimentos.map(e => e.id_empreendimento))
    const extras = EMPREENDIMENTOS_CVCRM.filter(e => !ids.has(e.id))
    return [
      ...empreendimentos.map(e => ({ id: e.id_empreendimento, nome: e.nome })),
      ...extras,
    ]
  }, [empreendimentos])

  return (
    <div className="p-6 space-y-5">
      {/* ── Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Map className="h-6 w-6 text-primary" />
            Mapa de Disponibilidade
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize as unidades dos empreendimentos em tempo real via CVCRM.
          </p>
        </div>
        {selectedId && isAdmin && mapa && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setImportOpen(true)}>
            <Upload className="h-3.5 w-3.5" /> Importar valores
          </Button>
        )}
      </div>

      {/* ── Seletor */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 min-w-[260px]">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Empreendimento
              </label>
              <Select value={selectedId ?? ''} onValueChange={handleSelect}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione um empreendimento..." />
                </SelectTrigger>
                <SelectContent>
                  {listaSelect.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedId && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar unidade…"
                  className="h-9 pl-8 w-44 text-sm"
                />
              </div>
            )}

            {selectedId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Estado vazio */}
      {!selectedId && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Map className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">Selecione um empreendimento para carregar o mapa.</p>
        </div>
      )}

      {/* ── Carregando */}
      {selectedId && isLoading && (
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando unidades do CVCRM…
        </div>
      )}

      {/* ── Erro */}
      {errMsg && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Não foi possível carregar o mapa</p>
              <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">{errMsg}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Mapa carregado */}
      {mapa && !isLoading && (
        <>
          {/* Painel de totais */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Empreendimento
                  </p>
                  <p className="text-lg font-bold text-foreground leading-none">{empNome}</p>
                </div>

                <div className="flex items-center gap-5 flex-wrap">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-foreground">{mapa.totais.total}</p>
                  </div>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  {LEGENDA.filter(l => !(!isAdmin) || l.status !== 'bloqueada').map(l => {
                    const count = mapa.totais[l.status] ?? 0
                    if (count === 0) return null
                    return (
                      <div key={l.status}>
                        <div className="flex items-center gap-1 mb-0.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_BG[l.status] }} />
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l.label}</p>
                        </div>
                        <p className="text-xl font-bold pl-3" style={{ color: STATUS_BG[l.status] }}>{count}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Barra proporcional global */}
              <div className="mt-4 h-2 rounded-full overflow-hidden bg-border flex">
                {LEGENDA.map(l => {
                  const count = mapa.totais[l.status] ?? 0
                  const pct = mapa.totais.total > 0 ? (count / mapa.totais.total) * 100 : 0
                  return pct > 0 ? (
                    <div
                      key={l.status}
                      style={{ width: `${pct}%`, backgroundColor: STATUS_BG[l.status] }}
                      title={`${l.label}: ${count}`}
                    />
                  ) : null
                })}
              </div>

              {/* Legenda */}
              <div className="mt-3 flex flex-wrap gap-3">
                {LEGENDA.map(l => (
                  <div key={l.status} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_BG[l.status] }} />
                    <span className="text-[11px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Blocos */}
          {(mapaFiltrado?.blocos.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {busca ? `Nenhuma unidade encontrada para "${busca}".` : 'Nenhuma unidade retornada para este empreendimento.'}
            </p>
          ) : (
            <div className="space-y-4">
              {mapaFiltrado?.blocos.map((b, i) => (
                <BlocoGrid
                  key={`${b.fase}-${b.bloco}-${i}`}
                  bloco={b}
                  valores={valores}
                  vistoriaMap={vistoriaMap}
                  onSelect={setUnidadeAtiva}
                  hideBloqueada={!isAdmin}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Painel lateral da unidade */}
      <UnidadeSidePanel
        open={!!unidadeAtiva}
        onClose={() => setUnidadeAtiva(null)}
        unidade={unidadeAtiva}
        empreendimentoId={selectedId ?? ''}
        empreendimentoNome={empNome}
        valorRow={unidadeAtiva ? (valores[`${unidadeAtiva.bloco}::${unidadeAtiva.unidade}`] ?? null) : null}
        canEdit={isAdmin}
      />

      {/* ── Importar valores */}
      {selectedId && mapa && (
        <ImportarValoresDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          idEmpreendimento={selectedId}
          unidades={mapa.blocos.flatMap(b => b.unidades.map(u => ({ bloco: u.bloco, unidade: u.unidade })))}
        />
      )}
    </div>
  )
}
