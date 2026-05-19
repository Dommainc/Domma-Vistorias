import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Search, RefreshCw, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PainelTotalizadores } from '@/components/mapa/PainelTotalizadores'
import { GradeUnidades } from '@/components/mapa/GradeUnidades'
import { DrawerUnidade } from '@/components/mapa/DrawerUnidade'
import { useMapaDisponibilidade } from '@/hooks/useMapaDisponibilidade'
import type { UnidadeCompleta, StatusVistoria } from '@/types/cvcrm'

export default function MapaDisponibilidade() {
  const { empreendimentoId } = useParams<{ empreendimentoId: string }>()
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<UnidadeCompleta | null>(null)
  const [filtros, setFiltros] = useState<StatusVistoria[]>([])
  const [busca, setBusca] = useState('')

  // Buscar dados do empreendimento no Supabase para pegar cvcrm_id
  const { data: empreendimento } = useQuery({
    queryKey: ['empreendimento', empreendimentoId],
    enabled: !!empreendimentoId,
    queryFn: async () => {
      const { data } = await supabase
        .from('empreendimentos')
        .select('id, nome, cvcrm_id')
        .eq('id', empreendimentoId!)
        .single()
      return data
    },
  })

  const cvcrmId = (empreendimento as { cvcrm_id?: number } | null)?.cvcrm_id ?? null

  const {
    data: mapa,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useMapaDisponibilidade(empreendimentoId!, cvcrmId)

  const toggleFiltro = (status: StatusVistoria) => {
    setFiltros(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }

  // Skeleton de carregamento
  if (isLoading) {
    return (
      <div className="space-y-6 p-6" style={{ backgroundColor: '#F5F5F5', minHeight: '100vh' }}>
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  // Estado de erro
  if (isError || (empreendimento && !cvcrmId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <div>
          <p className="font-semibold text-lg">
            {!cvcrmId
              ? 'Este empreendimento não está vinculado ao CVCRM'
              : 'Erro ao carregar o mapa de disponibilidade'}
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            {!cvcrmId
              ? 'Configure o cvcrm_id no Supabase para este empreendimento.'
              : 'Verifique sua conexão e tente novamente.'}
          </p>
        </div>
        {cvcrmId && (
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        )}
      </div>
    )
  }

  if (!mapa) return null

  return (
    <div style={{ backgroundColor: '#F5F5F5', minHeight: '100vh' }}>
      {/* Header principal */}
      <div style={{ backgroundColor: '#1B5E20' }} className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-200 text-xs uppercase tracking-wider font-medium">
              Mapa de Disponibilidade
            </p>
            <h1 className="text-white text-xl font-bold font-heading mt-0.5">
              {mapa.nome || empreendimento?.nome}
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-green-400 text-green-100 hover:bg-green-800 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Painel de totalizadores */}
      <div className="bg-white border-b px-6 py-4">
        <PainelTotalizadores
          empreendimento={mapa}
          filtros={filtros}
          onToggleFiltro={toggleFiltro}
        />
      </div>

      {/* Barra de busca */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar unidade (ex: BL 01-102)"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Grade de unidades */}
      <div className="p-6">
        {mapa.blocos.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            Nenhuma unidade encontrada.
          </div>
        ) : (
          <GradeUnidades
            blocos={mapa.blocos}
            filtros={filtros}
            busca={busca}
            onUnidadeClick={setUnidadeSelecionada}
          />
        )}
      </div>

      {/* Drawer lateral */}
      <DrawerUnidade
        unidade={unidadeSelecionada}
        onClose={() => setUnidadeSelecionada(null)}
      />
    </div>
  )
}
