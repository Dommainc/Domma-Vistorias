import { useEffect, useState } from 'react'
import { X, Mail, Phone, MapPin, FileText, ArrowRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { STATUS_CONFIG } from '@/hooks/useStatusConfig'
import { fetchPessoa } from '@/hooks/useMapaDisponibilidade'
import type { UnidadeCompleta, Pessoa } from '@/types/cvcrm'
import { supabase } from '@/integrations/supabase/client'

interface Props {
  unidade: UnidadeCompleta | null
  onClose: () => void
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`h-4 bg-gray-200 rounded animate-pulse ${className}`} />
}

export function DrawerUnidade({ unidade, onClose }: Props) {
  const navigate = useNavigate()
  const [pessoa, setPessoa] = useState<Pessoa | null>(null)
  const [loadingPessoa, setLoadingPessoa] = useState(false)
  const [documentos, setDocumentos] = useState<{ nome_arquivo: string; tipo_documento: string | null; arquivo_url: string }[]>([])

  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Buscar dados ao abrir drawer
  useEffect(() => {
    if (!unidade) { setPessoa(null); setDocumentos([]); return }

    if (unidade.id_pessoa) {
      setLoadingPessoa(true)
      fetchPessoa(unidade.id_pessoa)
        .then(p => setPessoa(p))
        .catch(() => setPessoa(null))
        .finally(() => setLoadingPessoa(false))
    } else {
      setPessoa(null)
      setLoadingPessoa(false)
    }

    // Buscar documentos do cliente vinculado à unidade no Supabase
    if (unidade.supabaseUnidadeId) {
      supabase
        .from('clientes')
        .select('id')
        .eq('unidade_id', unidade.supabaseUnidadeId)
        .maybeSingle()
        .then(({ data: cliente }) => {
          if (!cliente) return
          return supabase
            .from('documentos')
            .select('nome_arquivo, tipo_documento, arquivo_url')
            .eq('cliente_id', cliente.id)
        })
        .then(res => setDocumentos(res?.data ?? []))
        .catch(() => setDocumentos([]))
    }
  }, [unidade])

  const isOpen = !!unidade
  const config = unidade ? STATUS_CONFIG[unidade.statusVistoria] : null

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes da unidade ${unidade?.codigo ?? ''}`}
        className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {unidade && config && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{unidade.codigo}</span>
                <Badge
                  style={{ backgroundColor: config.cor, color: config.textoCor }}
                >
                  {config.label}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

              {/* Seção 1 — Unidade */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Unidade
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Código</p>
                    <p className="font-medium">{unidade.codigo}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Metragem</p>
                    <p className="font-medium">{unidade.metragem.toFixed(2)}m²</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Tipo</p>
                    <p className="font-medium">{unidade.tipo || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Andar</p>
                    <p className="font-medium">{unidade.andar}º</p>
                  </div>
                  {unidade.dataUltimaAtualizacao && (
                    <div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Atualizado em {new Date(unidade.dataUltimaAtualizacao).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              </section>

              {/* Seção 2 — Cliente */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Proprietário
                </h3>
                {loadingPessoa ? (
                  <div className="space-y-2">
                    <SkeletonLine className="w-3/4" />
                    <SkeletonLine className="w-1/2" />
                    <SkeletonLine className="w-2/3" />
                    <SkeletonLine className="w-1/3" />
                  </div>
                ) : !unidade.id_pessoa || !pessoa ? (
                  <div className="rounded-lg bg-gray-100 p-3 text-sm text-muted-foreground">
                    Sem proprietário cadastrado
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-base">{pessoa.nome}</p>
                    {pessoa.cpf && (
                      <p className="text-muted-foreground">CPF: {pessoa.cpf}</p>
                    )}
                    {pessoa.email && (
                      <a
                        href={`mailto:${pessoa.email}`}
                        className="flex items-center gap-1.5 text-blue-600 hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {pessoa.email}
                      </a>
                    )}
                    {pessoa.celular && (
                      <a
                        href={`tel:${pessoa.celular}`}
                        className="flex items-center gap-1.5 text-blue-600 hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {pessoa.celular}
                      </a>
                    )}
                    {pessoa.telefone && pessoa.telefone !== pessoa.celular && (
                      <a
                        href={`tel:${pessoa.telefone}`}
                        className="flex items-center gap-1.5 text-blue-600 hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {pessoa.telefone}
                      </a>
                    )}
                    {pessoa.endereco && (
                      <div className="flex items-start gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>
                          {pessoa.endereco.logradouro}, {pessoa.endereco.numero} —{' '}
                          {pessoa.endereco.bairro}, {pessoa.endereco.cidade}/{pessoa.endereco.estado},{' '}
                          CEP {pessoa.endereco.cep}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Seção 3 — Valor */}
              {unidade.valor > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Contrato
                  </h3>
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">Valor da unidade</p>
                    <p className="font-semibold text-base">
                      {unidade.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </section>
              )}

              {/* Seção 4 — Documentos */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Documentos
                </h3>
                {documentos.length === 0 ? (
                  <div className="rounded-lg bg-gray-100 p-3 text-sm text-muted-foreground">
                    Nenhum documento cadastrado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documentos.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between text-sm border rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium truncate max-w-[200px]">{doc.nome_arquivo}</p>
                            {doc.tipo_documento && (
                              <p className="text-xs text-muted-foreground">{doc.tipo_documento}</p>
                            )}
                          </div>
                        </div>
                        <a
                          href={doc.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline shrink-0"
                        >
                          Visualizar
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Rodapé fixo */}
            <div className="p-4 border-t flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  navigate(`/unidades/${unidade.supabaseUnidadeId ?? ''}`)
                  onClose()
                }}
              >
                Ir para Vistoria
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigate(`/historico?unidade=${unidade.id}`)
                  onClose()
                }}
              >
                Ver Histórico
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
