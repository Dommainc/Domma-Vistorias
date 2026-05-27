/**
 * Página: Gestão de Liberação de Unidades
 * Rota: /empreendimentos/:id/liberacao
 * Acessível a: admin, vistoriador, relacionamento
 */

import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { GestaoLiberacaoTable } from '@/components/mapa/GestaoLiberacaoTable'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2 } from 'lucide-react'

export default function LiberacaoUnidades() {
  const { id } = useParams<{ id: string }>() // id = cvcrm_id_empreendimento (texto, ex: "2")
  const navigate = useNavigate()

  const { data: empNome } = useQuery({
    queryKey: ['emp-mapa-nome', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from('empreendimentos_mapa' as any)
        .select('nome')
        .eq('id_empreendimento', id!)
        .maybeSingle()
      return (data as any)?.nome ?? id
    },
  })

  if (!id) return null

  return (
    <div className="space-y-5 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h1 className="font-heading text-xl font-bold">Liberação de Unidades</h1>
          </div>
          <p className="text-sm text-muted-foreground">{empNome ?? id}</p>
        </div>
      </div>

      {/* Legenda de alçadas */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border rounded-lg px-4 py-3 bg-muted/30">
        <span className="font-medium text-foreground">Como funciona:</span>
        <span>🔵 <b>1ª alçada</b> — liberada pelo Vistoriador</span>
        <span>🟢 <b>2ª alçada</b> — liberada pelo Relacionamento (exige 1ª alçada)</span>
        <span>✅ Unidade <b>Liberada</b> = apta para iniciar vistoria (quando Vendida no CVCRM)</span>
      </div>

      {/* Tabela principal */}
      <GestaoLiberacaoTable cvcrm_id_empreendimento={id} />
    </div>
  )
}
