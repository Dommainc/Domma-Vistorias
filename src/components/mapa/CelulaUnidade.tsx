import { STATUS_CONFIG } from '@/hooks/useStatusConfig'
import type { UnidadeCompleta } from '@/types/cvcrm'

interface Props {
  unidade: UnidadeCompleta
  onClick: (unidade: UnidadeCompleta) => void
  destacada?: boolean
}

export function CelulaUnidade({ unidade, onClick, destacada = true }: Props) {
  const config = STATUS_CONFIG[unidade.statusVistoria]

  if (!destacada) {
    return (
      <div
        className="rounded-md border-2 border-dashed border-gray-200 p-2 opacity-30 cursor-not-allowed"
        style={{ minHeight: 64 }}
      />
    )
  }

  return (
    <button
      onClick={() => onClick(unidade)}
      aria-label={`Unidade ${unidade.codigo} — ${config.label}`}
      className="w-full text-left rounded-md p-2 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
      style={{
        backgroundColor: config.cor,
        color: config.textoCor,
        minHeight: 64,
      }}
    >
      <p className="font-bold text-xs leading-tight truncate">{unidade.codigo}</p>
      <p className="text-xs opacity-80 mt-1">{unidade.metragem.toFixed(0)}m²</p>
    </button>
  )
}
