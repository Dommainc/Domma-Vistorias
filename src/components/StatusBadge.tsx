import { Badge } from "@/components/ui/badge";

const UNIT_STATUS: Record<string, { label: string; className: string }> = {
  aguardando_liberacao: {
    label: "Aguardando Liberação",
    className: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
  },
  unidade_liberada: {
    label: "Liberada",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
  },
};

const AGENDAMENTO_STATUS: Record<string, { label: string; className: string }> = {
  aguardando_confirmacao: {
    label: "Aguardando",
    className: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
  },
  vistoria_agendada: {
    label: "Agendada",
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  },
  vistoria_concluida: {
    label: "Concluída",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
  },
  vistoria_cancelada: {
    label: "Cancelada",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  },
};

export function UnitStatusBadge({ status }: { status: string | null }) {
  const s = UNIT_STATUS[status || ''] || { label: status || '-', className: "bg-gray-100 text-gray-600" };
  return <Badge variant="outline" className={`text-xs font-medium ${s.className}`}>{s.label}</Badge>;
}

export function AgendamentoStatusBadge({ status }: { status: string | null }) {
  const s = AGENDAMENTO_STATUS[status || ''] || { label: status || '-', className: "bg-gray-100 text-gray-600" };
  return <Badge variant="outline" className={`text-xs font-medium ${s.className}`}>{s.label}</Badge>;
}
