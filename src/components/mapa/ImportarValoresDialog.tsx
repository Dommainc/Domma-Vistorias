import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, Download, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react'
import { lerArquivoValores, validarLinhas, gerarTemplate } from '@/lib/valores-import'

interface Props {
  open: boolean
  onClose: () => void
  idEmpreendimento: string
  unidades: { bloco: string; unidade: string }[]
}

export function ImportarValoresDialog({ open, onClose, idEmpreendimento, unidades }: Props) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile]             = useState<File | null>(null)
  const [preview, setPreview]       = useState<any[] | null>(null)
  const [erros, setErros]           = useState<any[]>([])
  const [saving, setSaving]         = useState(false)
  const [done, setDone]             = useState(false)

  const handleFile = async (f: File) => {
    setFile(f); setDone(false)
    try {
      const rows   = await lerArquivoValores(f)
      const result = validarLinhas(rows)
      setPreview(result.validas)
      setErros(result.invalidas)
    } catch (e: any) {
      toast.error('Erro ao ler arquivo: ' + (e.message ?? ''))
    }
  }

  const handleSalvar = async () => {
    if (!preview?.length) return
    setSaving(true)
    try {
      const rows = preview.map(r => ({
        id_empreendimento: idEmpreendimento,
        bloco:             r.bloco,
        unidade:           r.unidade,
        valor_venda:       r.valor_venda,
        valor_avaliacao:   r.valor_avaliacao ?? null,
      }))
      const { error } = await supabase
        .from('unidade_valores' as any)
        .upsert(rows, { onConflict: 'id_empreendimento,bloco,unidade' })
      if (error) throw error
      toast.success(`${rows.length} valores importados com sucesso`)
      qc.invalidateQueries({ queryKey: ['unidade-valores', idEmpreendimento] })
      setDone(true)
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setFile(null); setPreview(null); setErros([]); setDone(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar valores em lote
          </DialogTitle>
        </DialogHeader>

        {/* Baixar template */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => gerarTemplate(unidades, 'xlsx')}>
            <Download className="h-3.5 w-3.5" /> Template XLSX
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => gerarTemplate(unidades, 'csv')}>
            <Download className="h-3.5 w-3.5" /> Template CSV
          </Button>
        </div>

        {/* Upload */}
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        >
          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {file ? file.name : 'Arraste ou clique para selecionar CSV/XLSX'}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>

        {/* Preview */}
        {preview !== null && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">{preview.length} linhas válidas</span>
              {erros.length > 0 && (
                <Badge variant="destructive" className="text-xs">{erros.length} com erro</Badge>
              )}
            </div>
            {preview.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border text-xs">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium">Bloco</th>
                      <th className="text-left px-2 py-1.5 font-medium">Unidade</th>
                      <th className="text-right px-2 py-1.5 font-medium">Venda</th>
                      <th className="text-right px-2 py-1.5 font-medium">Avaliação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{r.bloco}</td>
                        <td className="px-2 py-1">{r.unidade}</td>
                        <td className="px-2 py-1 text-right">{r.valor_venda?.toLocaleString('pt-BR')}</td>
                        <td className="px-2 py-1 text-right">{r.valor_avaliacao?.toLocaleString('pt-BR') ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {erros.length > 0 && (
              <div className="text-xs text-destructive flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>Linha(s) {erros.slice(0, 3).map(e => e.linha).join(', ')} ignoradas: {erros[0]?.motivo}</span>
              </div>
            )}
          </div>
        )}

        {done && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Importação concluída com sucesso!
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Fechar</Button>
          <Button
            disabled={!preview?.length || saving || done}
            onClick={handleSalvar}
            className="gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            {saving ? 'Importando…' : `Importar ${preview?.length ?? 0} linhas`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
