import type { MapaBloco, MapaUnidade, VistoriaStatusMap } from '@/types/mapa'
import { STATUS_BG, STATUS_LABEL, VISTORIA_STATUS_LABEL, VISTORIA_STATUS_LABEL_SHORT } from '@/types/mapa'
import type { ValoresMap } from '@/hooks/useMapaDisponibilidade'

interface Props {
  bloco: MapaBloco
  valores: ValoresMap
  vistoriaMap: VistoriaStatusMap
  onSelect: (u: MapaUnidade) => void
  hideBloqueada?: boolean
}

const LEGENDA = [
  { status: 'disponivel',  label: 'Disponível'  },
  { status: 'reservada',   label: 'Reservada'   },
  { status: 'vendida',     label: 'Vendida'     },
  { status: 'em_processo', label: 'Em Processo' },
  { status: 'bloqueada',   label: 'Bloqueada'   },
] as const

export function BlocoGrid({ bloco, valores, vistoriaMap, onSelect, hideBloqueada = false }: Props) {
  const counts = bloco.unidades.reduce(
    (acc, u) => { acc[u.status] = (acc[u.status] ?? 0) + 1; return acc },
    {} as Record<string, number>
  )
  const total = bloco.unidades.length
  const unidadesVisiveis = hideBloqueada
    ? bloco.unidades.map(u => u.status === 'bloqueada' ? { ...u, status: 'vendida' as const } : u)
    : bloco.unidades

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* ── Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Título do bloco */}
          <div className="flex items-center gap-2">
            {bloco.fase && (
              <>
                <span className="text-xs text-muted-foreground">{bloco.fase}</span>
                <span className="text-muted-foreground/40">›</span>
              </>
            )}
            <span className="text-sm font-semibold text-foreground">{bloco.bloco}</span>
            <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
              {total}
            </span>
          </div>

          {/* Mini totalizador */}
          <div className="flex items-center gap-3 flex-wrap">
            {LEGENDA.filter(l => !hideBloqueada || l.status !== 'bloqueada').map(l => {
              const count = counts[l.status] ?? 0
              if (count === 0) return null
              return (
                <div key={l.status} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_BG[l.status] }}
                  />
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: STATUS_BG[l.status] }}>{count}</span>
                  <span className="text-[10px] text-muted-foreground">{l.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Barra proporcional */}
        <div className="mt-2.5 h-1 rounded-full overflow-hidden bg-border flex">
          {LEGENDA.map(l => {
            const count = hideBloqueada && l.status === 'bloqueada' ? 0 : (counts[l.status] ?? 0)
            const pct = total > 0 ? (count / total) * 100 : 0
            return pct > 0 ? (
              <div
                key={l.status}
                style={{ width: `${pct}%`, backgroundColor: STATUS_BG[l.status] }}
                title={`${l.label}: ${count}`}
              />
            ) : null
          })}
        </div>
      </div>

      {/* ── Grade de células */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5 p-2.5">
        {unidadesVisiveis.map((u, i) => {
          const v = valores[`${u.bloco}::${u.unidade}`]
          const bg = STATUS_BG[u.status]
          const vistoriaStatus = vistoriaMap.get(`${u.bloco}::${u.unidade}`) ?? 'nao_liberada'
          const vistoriaLabel  = VISTORIA_STATUS_LABEL[vistoriaStatus]

          const vistoriaLabelShort = VISTORIA_STATUS_LABEL_SHORT[vistoriaStatus]
          const tooltip = [
            `${u.bloco} - ${u.unidade}`,
            STATUS_LABEL[u.status],
            `Vistoria: ${vistoriaLabel}`,
            v?.valor_venda     != null ? `Venda: R$ ${v.valor_venda.toLocaleString('pt-BR')}` : null,
            v?.valor_avaliacao != null ? `Avaliação: R$ ${v.valor_avaliacao.toLocaleString('pt-BR')}` : null,
            u.area_total != null ? `${u.area_total} m²` : null,
          ].filter(Boolean).join('\n')

          return (
            <button
              key={`${u.bloco}-${u.unidade}-${i}`}
              onClick={() => onSelect(u)}
              title={tooltip}
              className="relative rounded-lg text-white text-center transition-all duration-100 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-1 overflow-hidden"
              style={{ backgroundColor: bg, minHeight: 64 }}
            >
              {/* Conteúdo central */}
              <div className="flex flex-col items-center justify-center h-full px-1 pt-2 pb-5 gap-0.5">
                <span className="font-bold text-[11px] leading-tight truncate w-full text-center drop-shadow-sm">
                  {u.unidade}
                </span>
                {(u.area_privativa ?? u.area_total) != null && (
                  <span className="text-[8px] opacity-80 leading-none tabular-nums">
                    {(u.area_privativa ?? u.area_total)!.toFixed(1)} m²
                  </span>
                )}
              </div>

              {/* Faixa de status de vistoria */}
              <div
                className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-semibold leading-none py-1 truncate px-0.5"
                style={{ backgroundColor: 'rgba(0,0,0,0.40)', color: 'rgba(255,255,255,0.92)' }}
                title={vistoriaLabel}
              >
                {vistoriaLabelShort}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
