import { CelulaUnidade } from './CelulaUnidade'
import type { Bloco, UnidadeCompleta, StatusVistoria } from '@/types/cvcrm'
import { STATUS_CONFIG } from '@/hooks/useStatusConfig'

interface Props {
  blocos: Bloco[]
  filtros: StatusVistoria[]
  busca: string
  onUnidadeClick: (unidade: UnidadeCompleta) => void
}

export function GradeUnidades({ blocos, filtros, busca, onUnidadeClick }: Props) {
  return (
    <div className="space-y-8">
      {blocos.map(bloco => {
        const unidadesFiltradas = bloco.unidades.filter(u => {
          const passaFiltro = filtros.length === 0 || filtros.includes(u.statusVistoria)
          const passaBusca = busca === '' || u.codigo.toLowerCase().includes(busca.toLowerCase())
          return passaFiltro && passaBusca
        })

        // Totalizadores do bloco
        const totais = bloco.unidades.reduce((acc, u) => {
          acc[u.statusVistoria] = (acc[u.statusVistoria] ?? 0) + 1
          return acc
        }, {} as Record<StatusVistoria, number>)

        return (
          <div key={bloco.id}>
            {/* Header do bloco */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {bloco.fase}
              </span>
              <span className="text-xs text-muted-foreground">»</span>
              <span className="text-sm font-semibold">{bloco.nome}</span>
              <span className="text-xs text-muted-foreground ml-2">
                ({bloco.unidades.length} unidades)
              </span>
            </div>

            {/* Totalizadores do bloco */}
            <div className="flex flex-wrap gap-2 mb-3">
              {(Object.entries(totais) as [StatusVistoria, number][]).map(([status, count]) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: STATUS_CONFIG[status].cor + '22',
                    color: STATUS_CONFIG[status].cor,
                    border: `1px solid ${STATUS_CONFIG[status].cor}44`,
                  }}
                >
                  {STATUS_CONFIG[status].label}: {count}
                </span>
              ))}
            </div>

            {/* Grade de unidades */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {bloco.unidades.map(unidade => {
                const destacada =
                  (filtros.length === 0 || filtros.includes(unidade.statusVistoria)) &&
                  (busca === '' || unidade.codigo.toLowerCase().includes(busca.toLowerCase()))

                return (
                  <CelulaUnidade
                    key={unidade.id}
                    unidade={unidade}
                    onClick={onUnidadeClick}
                    destacada={destacada}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
