import { Badge } from "@/components/ui/badge";

const UNIT_STATUS: Record<string, { label: string; className: string }> = {
  aguardando_liberacao: { label: "⏳ Aguardando Liberação", className: "bg-warning text-warning-foreground" },
  unidade_liberada: { label: "✅ Unidade Liberada", className: "bg-success text-success-foreground" },
};

const AGENDAMENTO_STATUS: Record<string, { label: string; className: string }> = {
  aguardando_confirmacao: { label: "⏳ Aguardando Confirmação", className: "bg-warning text-warning-foreground" },
  vistoria_agendada: { label: "📅 Vistoria Agendada", className: "bg-info text-info-foreground" },
  vistoria_concluida: { label: "✅ Vistoria Concluída", className: "bg-success text-success-foreground" },
  vistoria_cancelada: { label: "❌ Vistoria Cancelada", className: "bg-destructive text-destructive-foreground" },
};

export function UnitStatusBadge({ status }: { status: string | null }) {
  const s = UNIT_STATUS[status || ''] || { label: status || '-', className: '' };
  return <Badge className={s.className}>{s.label}</Badge>;
}

export function AgendamentoStatusBadge({ status }: { status: string | null }) {
  const s = AGENDAMENTO_STATUS[status || ''] || { label: status || '-', className: '' };
  return <Badge className={s.className}>{s.label}</Badge>;
}
