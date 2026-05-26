import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, X, Check, Building2, Hash, LayoutGrid, Ruler, Car } from 'lucide-react'
import { STATUS_BG, STATUS_LABEL, type MapaUnidade } from '@/types/mapa'
import type { UnidadeValorRow } from '@/hooks/useMapaDisponibilidade'

interface Props {
  open: boolean
  onClose: () => void
  unidade: MapaUnidade | null
  empreendimentoId: string
  empreendimentoNome: string
  valorRow: UnidadeValorRow | null
  canEdit?: boolean
}

const fmtBRL = (v?: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function UnidadeModal({
  open, onClose, unidade, empreendimentoId, empreendimentoNome, valorRow, canEdit = false,
}: Props) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [valVenda, setValVenda]         = useState('')
  const [valAvaliacao, setValAvaliacao] = useState('')
  const [saving, setSaving] = useState(false)

  if (!unidade) return null

  const bg = STATUS_BG[unidade.status]
  const label = STATUS_LABEL[unidade.status]

  const handleOpenEdit = () => {
    setValVenda(valorRow?.valor_venda     != null ? String(valorRow.valor_venda)     : '')
    setValAvaliacao(valorRow?.valor_avaliacao != null ? String(valorRow.valor_avaliacao) : '')
    setEditing(true)
  }

  const parseNum = (s: string) => {
    if (!s.trim()) return null
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'))
    return isNaN(n) || n < 0 ? null : n
  }

  const handleSalvar = async () => {
    const venda     = parseNum(valVenda)
    const avaliacao = parseNum(valAvaliacao)
    if (valVenda     && venda     === null) { toast.error('Valor de venda inválido');     return }
    if (valAvaliacao && avaliacao === null) { toast.error('Valor de avaliação inválido'); return }

    setSaving(true)
    try {
      const { error } = await supabase.from('unidade_valores' as any).upsert(
        {
          id_empreendimento: empreendimentoId,
          bloco:   unidade.bloco,
          unidade: unidade.unidade,
          valor_venda:     venda,
          valor_avaliacao: avaliacao,
        },
        { onConflict: 'id_empreendimento,bloco,unidade' }
      )
      if (error) throw error
      toast.success('Valores salvos com sucesso')
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['unidade-valores', empreendimentoId] })
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        {/* ── Header colorido com status */}
        <div className="px-6 py-4 flex items-start justify-between" style={{ backgroundColor: bg }}>
          <div>
            <p className="text-white/75 text-[11px] font-medium uppercase tracking-widest mb-0.5">
              Unidade
            </p>
            <h2 className="text-white text-2xl font-bold leading-none">
              {unidade.bloco} – {unidade.unidade}
            </h2>
            <p className="text-white/80 text-sm mt-1">{empreendimentoNome}</p>
          </div>
          <span
            className="mt-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-white/30"
            style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.2)' }}
          >
            {label}
          </span>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* ── Dados técnicos */}
          <div className="grid grid-cols-2 gap-3">
            {unidade.tipo && (
              <InfoItem icon={<LayoutGrid className="h-3.5 w-3.5" />} label="Tipologia" value={unidade.tipo} />
            )}
            {unidade.area_total != null && (
              <InfoItem icon={<Ruler className="h-3.5 w-3.5" />} label="Área total" value={`${unidade.area_total} m²`} />
            )}
            {unidade.area_privativa != null && (
              <InfoItem icon={<Ruler className="h-3.5 w-3.5" />} label="Área privativa" value={`${unidade.area_privativa} m²`} />
            )}
            {unidade.vagas != null && (
              <InfoItem icon={<Car className="h-3.5 w-3.5" />} label="Vagas" value={String(unidade.vagas)} />
            )}
          </div>

          {/* ── Valores */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/50 border-b flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Valores
              </span>
              {canEdit && !editing && (
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleOpenEdit}>
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
              )}
            </div>

            {editing ? (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Valor de Venda (R$)</Label>
                    <Input
                      value={valVenda}
                      onChange={e => setValVenda(e.target.value)}
                      placeholder="Ex: 250000"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Valor de Avaliação (R$)</Label>
                    <Input
                      value={valAvaliacao}
                      onChange={e => setValAvaliacao(e.target.value)}
                      placeholder="Ex: 240000"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setEditing(false)}>
                    <X className="h-3 w-3" /> Cancelar
                  </Button>
                  <Button size="sm" className="h-7 gap-1" disabled={saving} onClick={handleSalvar}>
                    <Check className="h-3 w-3" /> {saving ? 'Salvando…' : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 divide-x">
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Venda</p>
                  <p className="text-base font-bold text-foreground">{fmtBRL(valorRow?.valor_venda)}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Avaliação</p>
                  <p className="text-base font-bold text-foreground">{fmtBRL(valorRow?.valor_avaliacao)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}
