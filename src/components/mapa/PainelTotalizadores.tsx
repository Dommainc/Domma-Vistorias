import { STATUS_CONFIG, STATUS_ORDER } from '@/hooks/useStatusConfig'
import type { StatusVistoria, EmpreendimentoCVCRM } from '@/types/cvcrm'

interface Props {
  empreendimento: EmpreendimentoCVCRM
  filtros: StatusVistoria[]
  onToggleFiltro: (status: StatusVistoria) => void
}

export function PainelTotalizadores({ empreendimento, filtros, onToggleFiltro }: Props) {
  // Contar por status
  const contagens = STATUS_ORDER.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<StatusVistoria, number>)
  let total = 0

  for (const bloco of empreendimento.blocos) {
    for (const u of bloco.unidades) {
      contagens[u.statusVistoria] = (contagens[u.statusVistoria] ?? 0) + 1
      total++
    }
  }

  const concluidas = (contagens.aprovada ?? 0) + (contagens.agendada ?? 0)
  const percentual = total > 0 ? Math.round((concluidas / total) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Barra de progresso */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${percentual}%`, backgroundColor: '#FFC107' }}
          />
        </div>
        <span className="text-sm font-semibold text-amber-600 whitespace-nowrap">
          {percentual}%
        </span>
      </div>

      {/* Stats + Legenda */}
      <div className="flex flex-wrap gap-6 items-start">
        {/* Total */}
        <div className="text-center">
          <p className="text-3xl font-bold font-heading">{empreendimento.totalUnidades || total}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
        </div>

        {/* Legenda com filtros */}
        <div className="flex flex-wrap gap-2 flex-1">
          {STATUS_ORDER.filter(s => contagens[s] > 0).map(status => {
            const config = STATUS_CONFIG[status]
            const ativo = filtros.length === 0 || filtros.includes(status)
            return (
              <button
                key={status}
                onClick={() => onToggleFiltro(status)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all"
                style={{
                  backgroundColor: ativo ? config.cor : 'transparent',
                  color: ativo ? config.textoCor : config.cor,
                  borderColor: config.cor,
                  opacity: filtros.length > 0 && !filtros.includes(status) ? 0.5 : 1,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ativo ? config.textoCor : config.cor }}
                />
                {config.label}
                <span className="font-bold">{contagens[status]}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
