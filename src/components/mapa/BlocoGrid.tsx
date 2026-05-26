import type { MapaBloco, MapaUnidade } from '@/types/mapa'
import { STATUS_BG, STATUS_LABEL } from '@/types/mapa'
import type { ValoresMap } from '@/hooks/useMapaDisponibilidade'

interface Props {
  bloco: MapaBloco
  valores: ValoresMap
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

export function BlocoGrid({ bloco, valores, onSelect, hideBloqueada = false }: Props) {
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
      <div className="px-4 py-3 border-b border-border bg-muted/40">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span className="text-muted-foreground font-normal">{bloco.fase}</span>
            <span className="text-muted-foreground">»</span>
            <span className="text-muted-foreground">{'>'}</span>
            <span>{bloco.bloco}</span>
            <span className="ml-1 text-[11px] font-normal text-muted-foreground">({total} unidades)</span>
          </div>

          {/* Mini totalizador */}
          <div className="flex items-center gap-3 flex-wrap">
            {LEGENDA.filter(l => !hideBloqueada || l.status !== 'bloqueada').map(l => {
              const count = counts[l.status] ?? 0
              if (count === 0) return null
              return (
                <div key={l.status} className="flex items-center gap-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_BG[l.status] }}
                  />
                  <span className="text-[11px] text-muted-foreground">{l.label}</span>
                  <span className="text-[11px] font-bold text-foreground">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Barra proporcional */}
        <div className="mt-2.5 h-1.5 rounded-full overflow-hidden bg-border flex">
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
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1 p-2">
        {unidadesVisiveis.map((u, i) => {
          const v = valores[`${u.bloco}::${u.unidade}`]
          const bg = STATUS_BG[u.status]
          const tooltip = [
            STATUS_LABEL[u.status],
            v?.valor_venda     != null ? `Venda: R$ ${v.valor_venda.toLocaleString('pt-BR')}` : null,
            v?.valor_avaliacao != null ? `Avaliação: R$ ${v.valor_avaliacao.toLocaleString('pt-BR')}` : null,
            u.area_total != null ? `${u.area_total} m²` : null,
          ].filter(Boolean).join(' · ')

          return (
            <button
              key={`${u.bloco}-${u.unidade}-${i}`}
              onClick={() => onSelect(u)}
              title={tooltip}
              className="relative rounded-md text-white text-center transition-all duration-100 hover:brightness-110 hover:-translate-y-px hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-1 overflow-hidden"
              style={{ backgroundColor: bg, minHeight: 54 }}
            >
              <div className="flex flex-col items-center justify-center h-full px-1 py-1.5 gap-0.5">
                <span className="font-bold text-[11px] leading-tight tracking-wide truncate w-full text-center">
                  {u.unidade}
                </span>
                {u.area_total != null && (
                  <span className="text-[9px] opacity-85 leading-none">
                    {u.area_total.toFixed(0)} m²
                  </span>
                )}
              </div>
              {/* Faixa de status de vistoria — reservado para integração futura */}
            </button>
          )
        })}
      </div>
    </div>
  )
}
