import { STATUS_CONFIG } from '@/hooks/useStatusConfig'
import type { UnidadeCompleta } from '@/types/cvcrm'

interface Props {
  unidade: UnidadeCompleta
  onClick: (unidade: UnidadeCompleta) => void
  destacada?: boolean
}

// Mapeamento do status comercial do CVCRM → cor de badge
function getCVCRMBadge(status: string): { bg: string; text: string; label: string } | null {
  const s = status.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (!s || s === '') return null
  if (s.includes('dispon')) return { bg: 'rgba(0,0,0,0.25)', text: '#fff', label: 'Disponível' }
  if (s.includes('vend'))   return { bg: '#7f1d1d', text: '#fca5a5', label: 'Vendida' }
  if (s.includes('reserv')) return { bg: '#78350f', text: '#fcd34d', label: 'Reservada' }
  if (s.includes('bloqu'))  return { bg: 'rgba(0,0,0,0.3)', text: '#d1d5db', label: 'Bloqueada' }
  if (s.includes('processo') || s.includes('process')) return { bg: '#1e3a5f', text: '#93c5fd', label: 'Em Processo' }
  if (s.includes('distrat')) return { bg: '#4c1d95', text: '#c4b5fd', label: 'Distrato' }
  // fallback: mostra o valor bruto
  return { bg: 'rgba(0,0,0,0.2)', text: '#fff', label: status }
}

export function CelulaUnidade({ unidade, onClick, destacada = true }: Props) {
  const config = STATUS_CONFIG[unidade.statusVistoria]
  const cvBadge = getCVCRMBadge(unidade.status ?? '')

  if (!destacada) {
    return (
      <div
        className="rounded-lg border-2 border-dashed border-gray-200 opacity-20 cursor-not-allowed"
        style={{ minHeight: 64 }}
      />
    )
  }

  return (
    <button
      onClick={() => onClick(unidade)}
      aria-label={`Unidade ${unidade.codigo} — ${config.label}${cvBadge ? ` (${cvBadge.label})` : ''}`}
      className="w-full rounded-lg transition-all duration-150 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-white/50 active:scale-95 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5"
      style={{ backgroundColor: config.cor, minHeight: 64 }}
    >
      {/* Código da unidade */}
      <span
        className="font-bold text-sm tracking-wide leading-tight text-center"
        style={{ color: config.textoCor }}
      >
        {unidade.codigo}
      </span>

      {/* Badge status CVCRM */}
      {cvBadge && (
        <span
          className="text-[9px] font-semibold uppercase tracking-wider leading-none px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: cvBadge.bg, color: cvBadge.text }}
        >
          {cvBadge.label}
        </span>
      )}
    </button>
  )
}
